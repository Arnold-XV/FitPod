/**
 * Routine Repository Implementation (L4)
 */

import { Store } from 'n3';
import type { RoutineRepository } from '@/domain/workout/ports';
import type { Routine } from '@/domain/workout/entities';
import { validateRoutine } from '@/domain/workout/validators';
import { appError, failure, success, type Result } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';
import { routineToQuads, quadsToRoutine } from './mappers';

interface RoutineRepositoryConfig {
  solidIo: SolidIo;
  storageRoot?: string;
}

class RoutineRepositoryImpl implements RoutineRepository {
  private solidIo: SolidIo;
  private _storageRoot: string = '';

  constructor(config: RoutineRepositoryConfig) {
    this.solidIo = config.solidIo;
    if (config.storageRoot) {
      this._storageRoot = config.storageRoot;
    }
  }

  setStorageRoot(root: string): void {
    this._storageRoot = root;
  }

  private getRoutineContainerUrl(): string {
    return `${this._storageRoot}fitpod/workout/routines/`;
  }

  private getResourceUrl(id: string): string {
    return `${this.getRoutineContainerUrl()}${id}.ttl`;
  }

  async add(routine: Routine): Promise<Result<void>> {
    const domainValidation = validateRoutine(routine);
    if (!domainValidation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid routine data', domainValidation.errors)
      );
    }

    const url = this.getResourceUrl(routine.id);
    const quads = routineToQuads(routine, `${url}#it`);
    const store = new Store();
    quads.forEach(q => store.addQuad(q));

    return await this.solidIo.putNew(url, store);
  }

  async update(routine: Routine): Promise<Result<void>> {
    const domainValidation = validateRoutine(routine);
    if (!domainValidation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid routine data', domainValidation.errors)
      );
    }

    const url = this.getResourceUrl(routine.id);
    const currentResult = await this.solidIo.readTurtle(url);
    if (!currentResult.ok) {
      return failure(currentResult.error);
    }

    const { etag } = currentResult.value;
    if (!etag) {
      return failure(appError('Conflict', 'No ETag found for conditional update'));
    }

    const quads = routineToQuads(routine, `${url}#it`);
    const store = new Store();
    quads.forEach(q => store.addQuad(q));
    return await this.solidIo.putReplace(url, store, etag);
  }

  async delete(id: string): Promise<Result<void>> {
    const url = this.getResourceUrl(id);
    return await this.solidIo.deleteResource(url);
  }

  async get(id: string): Promise<Result<Routine>> {
    const url = this.getResourceUrl(id);
    const result = await this.solidIo.readTurtle(url);

    if (!result.ok) {
      return failure(result.error);
    }

    try {
      const routine = quadsToRoutine(result.value.store.getQuads(null, null, null, null), `${url}#it`);
      if (!routine) {
        return failure(appError('ValidationFailed', 'Failed to parse routine'));
      }
      return success(routine);
    } catch (error) {
      return failure(
        appError(
          'ValidationFailed',
          'Failed to parse routine',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async list(): Promise<Result<Routine[]>> {
    const routines: Routine[] = [];
    
    try {
      const containerUrl = this.getRoutineContainerUrl();
      const listResult = await this.solidIo.listContainer(containerUrl);
      
      if (!listResult.ok) {
        // Container might not exist
        return success([]);
      }

      const readPromises = listResult.value.map(async (resourceUrl) => {
        const result = await this.solidIo.readTurtle(resourceUrl);
        if (!result.ok) return null;
        
        try {
          return quadsToRoutine(result.value.store.getQuads(null, null, null, null), `${resourceUrl}#it`);
        } catch (error) {
          console.warn(`Failed to parse ${resourceUrl}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(readPromises);
      routines.push(...results.filter((r): r is Routine => r !== null));

      return success(routines);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to list routines',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }
}

export const createRoutineRepository = (config: RoutineRepositoryConfig): RoutineRepository => {
  return new RoutineRepositoryImpl(config);
};
