/**
 * Body Repository Implementation (L4)
 * Implements BodyRepository port from L3
 * AR-06: SHACL validation before write
 */

import { DataFactory, Parser, Store } from 'n3';
import type { BodyRepository } from '@/domain/body/ports';
import type { BodyMeasurement } from '@/domain/body/entities';
import { validateBodyMeasurement } from '@/domain/body/entities';
import { appError, failure, success, type Result } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';
import { PIM } from '@fitpod/vocab';

const { namedNode, literal } = DataFactory;

// FitPod vocabulary namespace
const FP = 'https://w3id.org/fitpod/ns#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

interface BodyRepositoryConfig {
  solidIo: SolidIo;
  storageRoot?: string; // Optional - will be discovered if not provided
}

class BodyRepositoryImpl implements BodyRepository {
  private solidIo: SolidIo;
  private _storageRoot: string = '';
  private _webId?: string;
  private _storageRootDiscovered: boolean = false;

  constructor(config: BodyRepositoryConfig) {
    this.solidIo = config.solidIo;
    if (config.storageRoot && config.storageRoot.length > 0) {
      this._storageRoot = config.storageRoot;
      this._storageRootDiscovered = true;
    }
  }

  /**
   * Set WebID for storage root discovery.
   * Must be called before any repository operations.
   */
  setWebId(webId: string): void {
    this._webId = webId;
  }

  /**
   * Discover storage root from WebID document using pim:storage predicate.
   * Falls back to host-based inference if pim:storage is not present.
   * AR-19: Storage root discovery via pim:storage
   */
  async ensureStorageRoot(): Promise<void> {
    if (this._storageRootDiscovered || !this._webId) {
      return;
    }

    try {
      // Fetch WebID document using the http from podHttp (authed)
      const response = await this.solidIo.getHttp().authed(this._webId, {
        headers: { Accept: 'text/turtle' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch WebID document: ${response.status}`);
      }

      const text = await response.text();
      const parser = new Parser({ baseIRI: this._webId });
      const store = new Store();

      await new Promise<void>((resolve, reject) => {
        parser.parse(text, (error: Error | null, quad: any) => {
          if (error) return reject(error);
          if (quad) store.addQuad(quad);
          else resolve();
        });
      });

      // Look for pim:storage predicate
      const webIdNode = namedNode(this._webId);
      const pimStoragePredicate = namedNode(`${PIM}storage`);

      const storageQuads = store.getQuads(webIdNode as any, pimStoragePredicate as any, null, null);

      if (storageQuads.length > 0) {
        const storageRoot = storageQuads[0].object.value;
        console.log(`[Repository] Discovered storage root via pim:storage: ${storageRoot}`);
        this._storageRoot = storageRoot;
      } else {
        // Fallback: derive from WebID host
        const url = new URL(this._webId);
        const fallbackStorageRoot = `${url.protocol}//${url.host}/`;
        console.log(`[Repository] Using fallback storage root from WebID host: ${fallbackStorageRoot}`);
        this._storageRoot = fallbackStorageRoot;
      }
    } catch (error) {
      console.warn(`[Repository] Failed to discover storage root, using fallback: ${error}`);
      // Fallback: derive from WebID host
      if (this._webId) {
        const url = new URL(this._webId);
        this._storageRoot = `${url.protocol}//${url.host}/`;
      }
    }

    this._storageRootDiscovered = true;
  }

  /**
   * Get storage root for testing/debugging.
   */
  getStorageRoot(): string {
    return this._storageRoot;
  }

  private getBodyContainerUrl(): string {
    return `${this._storageRoot}fitpod/body/`;
  }

  private getResourceUrl(id: string, date: string): string {
    // SAD AR-18: sharding yyyy/mm
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${this.getBodyContainerUrl()}${year}/${month}/${id}.ttl`;
  }

  async list(monthsBack: number = 12): Promise<Result<BodyMeasurement[]>> {
    // Ensure storage root is discovered before listing
    await this.ensureStorageRoot();

    // AR-20: Multi-month listing
    const measurements: BodyMeasurement[] = [];
    
    try {
      const now = new Date();

      // Iterate over last N months
      for (let i = 0; i < monthsBack; i++) {
        // Calculate the target date by going back i months
        const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth() + 1; // 1-indexed for URL

        const yearStr = String(year);
        const monthStr = String(month).padStart(2, '0');
        
        const containerUrl = `${this.getBodyContainerUrl()}${yearStr}/${monthStr}/`;

        const listResult = await this.solidIo.listContainer(containerUrl);
        
        if (!listResult.ok) {
          // Container might not exist, skip it
          continue;
        }

        // Read each measurement from this month
        for (const resourceUrl of listResult.value) {
          const readResult = await this.getById(
            resourceUrl.split('/').pop()?.replace('.ttl', '') ?? ''
          );
          if (readResult.ok && readResult.value) {
            measurements.push(readResult.value);
          }
        }
      }

      // Sort by date descending (newest first)
      measurements.sort((a, b) => b.date.localeCompare(a.date));

      return success(measurements);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          `Failed to list measurements (last ${monthsBack} months)`,
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async getById(id: string): Promise<Result<BodyMeasurement | null>> {
    // Try to extract date from ID if it follows format like "timestamp-based"
    // Otherwise search recent months
    await this.ensureStorageRoot();
    
    // Try current month first
    const now = new Date();
    
    // Search last 12 months for the measurement
    for (let i = 0; i < 12; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dateStr = `${year}-${month}-01`;
      
      const url = this.getResourceUrl(id, dateStr);
      const result = await this.solidIo.readTurtle(url);

      if (result.ok) {
        try {
          const measurement = this.parseBodyMeasurement(result.value.store, url);
          return success(measurement);
        } catch (error) {
          return failure(
            appError(
              'ValidationFailed',
              'Failed to parse measurement',
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
    
    // Not found in any recent month
    return success(null);
  }

  async add(measurement: BodyMeasurement): Promise<Result<void>> {
    // AR-06: Domain validation
    const domainValidation = validateBodyMeasurement(measurement);
    if (!domainValidation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid measurement data', domainValidation.errors)
      );
    }

    const url = this.getResourceUrl(measurement.id, measurement.date);
    const store = this.serializeBodyMeasurement(measurement, url);

    return await this.solidIo.putNew(url, store);
  }

  async update(measurement: BodyMeasurement): Promise<Result<void>> {
    // AR-06: Domain validation
    const domainValidation = validateBodyMeasurement(measurement);
    if (!domainValidation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid measurement data', domainValidation.errors)
      );
    }

    const url = this.getResourceUrl(measurement.id, measurement.date);
    
    // Read current resource to get ETag
    const currentResult = await this.solidIo.readTurtle(url);
    if (!currentResult.ok) {
      return failure(currentResult.error);
    }

    const { etag } = currentResult.value;
    if (!etag) {
      return failure(appError('Conflict', 'No ETag found for conditional update'));
    }

    const store = this.serializeBodyMeasurement(measurement, url);
    return await this.solidIo.putReplace(url, store, etag);
  }

  async remove(id: string, date?: string): Promise<Result<void>> {
    // Use provided date or derive from current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateStr = date ?? `${year}-${month}-01`;
    
    const url = this.getResourceUrl(id, dateStr);
    return await this.solidIo.deleteResource(url);
  }

  private serializeBodyMeasurement(measurement: BodyMeasurement, url: string): Store {
    const store = new Store();
    const subject = `${url}#it`;
    const quad = (p: string, o: string, datatype?: string) => {
      if (datatype) {
        return { subject: namedNode(subject), predicate: namedNode(p), object: literal(o, namedNode(datatype)) } as any;
      }
      return { subject: namedNode(subject), predicate: namedNode(p), object: datatype === 'uri' ? namedNode(o) : literal(o) } as any;
    };

    // Type
    store.addQuad(quad('http://www.w3.org/1999/02/22-rdf-syntax-ns#type', `${FP}BodyMeasurement`, 'uri'));

    // Schema version
    store.addQuad(quad(`${FP}schemaVersion`, String(measurement.schemaVersion), `${XSD}integer`));

    // Date
    store.addQuad(quad(`${FP}date`, measurement.date, `${XSD}date`));

    // Weight
    store.addQuad(quad(`${FP}weightKg`, String(measurement.weightKg), `${XSD}decimal`));

    // Height
    store.addQuad(quad(`${FP}heightCm`, String(measurement.heightCm), `${XSD}decimal`));

    // Optional fields
    if (measurement.bodyFatPct !== undefined) {
      store.addQuad(quad(`${FP}bodyFatPct`, String(measurement.bodyFatPct), `${XSD}decimal`));
    }

    if (measurement.bodyFatMethod) {
      store.addQuad(quad(`${FP}bodyFatMethod`, measurement.bodyFatMethod));
    }

    if (measurement.note) {
      store.addQuad(quad(`${FP}note`, measurement.note));
    }

    return store;
  }

  private parseBodyMeasurement(store: Store, url: string): BodyMeasurement {
    const subject = namedNode(`${url}#it`);

    const getObject = (predicate: string): string | null => {
      const quads = store.getQuads(subject as any, namedNode(predicate) as any, null, null);
      return quads[0]?.object.value ?? null;
    };

    const id = url.split('/').pop()?.replace('.ttl', '') ?? '';
    const date = getObject(`${FP}date`) ?? '';
    const weightKg = parseFloat(getObject(`${FP}weightKg`) ?? '0');
    const heightCm = parseFloat(getObject(`${FP}heightCm`) ?? '0');
    const schemaVersion = parseInt(getObject(`${FP}schemaVersion`) ?? '1', 10);

    const bodyFatPctStr = getObject(`${FP}bodyFatPct`);
    const bodyFatPct = bodyFatPctStr ? parseFloat(bodyFatPctStr) : undefined;
    
    const bodyFatMethod = getObject(`${FP}bodyFatMethod`) as
      | 'bia'
      | 'caliper'
      | 'dexa'
      | 'estimate'
      | undefined;

    const note = getObject(`${FP}note`) ?? undefined;

    return {
      id,
      date,
      weightKg,
      heightCm,
      bodyFatPct,
      bodyFatMethod,
      note,
      schemaVersion,
    };
  }
}

export const createBodyRepository = (config: BodyRepositoryConfig): BodyRepository => {
  return new BodyRepositoryImpl(config);
};
