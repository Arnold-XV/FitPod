/**
 * Session Repository Implementation (L4)
 * Implements SessionRepository port from L3
 * AR-06: Domain validation before write
 */

import { Store } from 'n3';
import type { SessionRepository } from '@/domain/workout/ports';
import type { WorkoutSession } from '@/domain/workout/entities';
import { validateSession } from '@/domain/workout/validators';
import { appError, failure, success, type Result } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';
import { sessionToQuads, quadsToSession } from './mappers';

interface SessionRepositoryConfig {
  solidIo: SolidIo;
  storageRoot?: string;
}

class SessionRepositoryImpl implements SessionRepository {
  private solidIo: SolidIo;
  private _storageRoot: string = '';

  constructor(config: SessionRepositoryConfig) {
    this.solidIo = config.solidIo;
    if (config.storageRoot && config.storageRoot.length > 0) {
      this._storageRoot = config.storageRoot;
    }
  }

  setStorageRoot(root: string): void {
    this._storageRoot = root;
  }

  private getSessionContainerUrl(): string {
    return `${this._storageRoot}fitpod/workout/sessions/`;
  }

  private getResourceUrl(id: string, date: string): string {
    // Sharding yyyy/mm
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${this.getSessionContainerUrl()}${year}/${month}/${id}.ttl`;
  }

  async add(session: WorkoutSession): Promise<Result<void>> {
    // Domain validation
    const domainValidation = validateSession(session);
    if (!domainValidation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid session data', domainValidation.errors)
      );
    }

    const url = this.getResourceUrl(session.id, session.date);
    const quads = sessionToQuads(session, `${url}#it`);
    const store = new Store();
    quads.forEach(q => store.addQuad(q));

    return await this.solidIo.putNew(url, store);
  }

  async update(session: WorkoutSession): Promise<Result<void>> {
    // Domain validation
    const domainValidation = validateSession(session);
    if (!domainValidation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid session data', domainValidation.errors)
      );
    }

    const url = this.getResourceUrl(session.id, session.date);
    
    // Read current resource to get ETag
    const currentResult = await this.solidIo.readTurtle(url);
    if (!currentResult.ok) {
      return failure(currentResult.error);
    }

    const { etag } = currentResult.value;
    if (!etag) {
      return failure(appError('Conflict', 'No ETag found for conditional update'));
    }

    const quads = sessionToQuads(session, `${url}#it`);
    const store = new Store();
    quads.forEach(q => store.addQuad(q));
    return await this.solidIo.putReplace(url, store, etag);
  }

  async delete(id: string): Promise<Result<void>> {
    // Search recent months for the session
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${year}-${month}-01`;
      
      const url = this.getResourceUrl(id, dateStr);
      const result = await this.solidIo.deleteResource(url);
      
      if (result.ok) {
        return success(undefined);
      }
      
      // If not found, continue to next month
      if (!result.ok && result.error.type !== 'NotFound') {
        return failure(result.error);
      }
    }
    
    return failure(appError('NotFound', 'Session not found'));
  }

  async get(id: string): Promise<Result<WorkoutSession>> {
    // Search recent months for the session
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${year}-${month}-01`;
      
      const url = this.getResourceUrl(id, dateStr);
      const result = await this.solidIo.readTurtle(url);

      if (result.ok) {
        try {
          const session = quadsToSession(result.value.store.getQuads(null, null, null, null), `${url}#it`);
          if (!session) {
            return failure(appError('ValidationFailed', 'Failed to parse session'));
          }
          return success(session);
        } catch (error) {
          return failure(
            appError(
              'ValidationFailed',
              'Failed to parse session',
              error instanceof Error ? error.message : String(error)
            )
          );
        }
      }
      
      // If not found and error is not NotFound, return the error
      if (!result.ok && result.error.type !== 'NotFound') {
        return failure(result.error);
      }
    }
    
    return failure(appError('NotFound', 'Session not found'));
  }

  async list(range?: { start: string; end: string }): Promise<Result<WorkoutSession[]>> {
    const sessions: WorkoutSession[] = [];
    
    try {
      const now = new Date();
      const startDate = range?.start ? new Date(range.start) : new Date(now.getFullYear(), now.getMonth() - 12, 1);
      const endDate = range?.end ? new Date(range.end) : now;

      // Calculate months to scan
      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      
      const monthsToScan: Array<{ year: number; month: number }> = [];
      let currentYear = startYear;
      let currentMonth = startMonth;
      
      while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
        monthsToScan.push({ year: currentYear, month: currentMonth + 1 }); // 1-indexed
        currentMonth++;
        if (currentMonth > 11) {
          currentMonth = 0;
          currentYear++;
        }
      }

      // Read sessions from each month
      for (const { year, month } of monthsToScan) {
        const monthStr = String(month).padStart(2, '0');
        const containerUrl = `${this.getSessionContainerUrl()}${year}/${monthStr}/`;

        const listResult = await this.solidIo.listContainer(containerUrl);
        
        if (!listResult.ok) {
          // Container might not exist, skip it
          continue;
        }

        // Read each session from this month
        const readPromises = listResult.value.map(async (resourceUrl) => {
          const result = await this.solidIo.readTurtle(resourceUrl);
          if (!result.ok) return null;
          
          try {
            return quadsToSession(result.value.store.getQuads(null, null, null, null), `${resourceUrl}#it`);
          } catch (error) {
            console.warn(`Failed to parse ${resourceUrl}:`, error);
            return null;
          }
        });
        
        const results = await Promise.all(readPromises);
        sessions.push(...results.filter((s): s is WorkoutSession => s !== null));
      }

      // Sort by date descending (newest first)
      sessions.sort((a, b) => b.startTime.localeCompare(a.startTime));

      return success(sessions);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to list sessions',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }
}

export const createSessionRepository = (config: SessionRepositoryConfig): SessionRepository => {
  return new SessionRepositoryImpl(config);
};
