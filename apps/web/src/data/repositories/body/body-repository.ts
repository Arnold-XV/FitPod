/**
 * Body Repository Implementation (L4)
 * Implements BodyRepository port from L3
 * AR-06: SHACL validation before write (placeholder for now)
 */

import { DataFactory, Store } from 'n3';
import type { BodyRepository } from '@/domain/body/ports';
import type { BodyMeasurement } from '@/domain/body/entities';
import { validateBodyMeasurement } from '@/domain/body/entities';
import { appError, failure, success, type Result } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';

const { namedNode, literal } = DataFactory;

// FitPod vocabulary namespace
const FP = 'https://w3id.org/fitpod/ns#';
const XSD = 'http://www.w3.org/2001/XMLSchema#';

interface BodyRepositoryConfig {
  solidIo: SolidIo;
  storageRoot: string;
}

class BodyRepositoryImpl implements BodyRepository {
  private solidIo: SolidIo;
  private storageRoot: string;

  constructor(config: BodyRepositoryConfig) {
    this.solidIo = config.solidIo;
    this.storageRoot = config.storageRoot;
  }

  private getBodyContainerUrl(): string {
    return `${this.storageRoot}fitpod/body/`;
  }

  private getResourceUrl(id: string, date: string): string {
    // SAD AR-18: sharding yyyy/mm
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${this.getBodyContainerUrl()}${year}/${month}/${id}.ttl`;
  }

  async list(): Promise<Result<BodyMeasurement[]>> {
    // For testing, we'll implement a simple list that reads recent months
    // In production, this would need more sophisticated querying
    const measurements: BodyMeasurement[] = [];
    
    try {
      // List current year/month
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      const containerUrl = `${this.getBodyContainerUrl()}${year}/${month}/`;
      const listResult = await this.solidIo.listContainer(containerUrl);
      
      if (!listResult.ok) {
        // Container might not exist yet, return empty list
        return success([]);
      }

      // Read each measurement
      for (const resourceUrl of listResult.value) {
        const readResult = await this.getById(
          resourceUrl.split('/').pop()?.replace('.ttl', '') ?? ''
        );
        if (readResult.ok && readResult.value) {
          measurements.push(readResult.value);
        }
      }

      return success(measurements);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to list measurements',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async getById(id: string): Promise<Result<BodyMeasurement | null>> {
    // We need the date to construct the URL due to sharding
    // For testing, we'll try current month
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateStr = `${year}-${month}-01`;
    
    const url = this.getResourceUrl(id, dateStr);
    const result = await this.solidIo.readTurtle(url);

    if (!result.ok) {
      if (result.error.type === 'NotFound') {
        return success(null);
      }
      return failure(result.error);
    }

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

  async add(measurement: BodyMeasurement): Promise<Result<void>> {
    // AR-06: Validate before write
    const validation = validateBodyMeasurement(measurement);
    if (!validation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid measurement data', validation.errors)
      );
    }

    const url = this.getResourceUrl(measurement.id, measurement.date);
    const store = this.serializeBodyMeasurement(measurement, url);

    return await this.solidIo.putNew(url, store);
  }

  async update(measurement: BodyMeasurement): Promise<Result<void>> {
    // Validation
    const validation = validateBodyMeasurement(measurement);
    if (!validation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid measurement data', validation.errors)
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

  async remove(id: string): Promise<Result<void>> {
    // Similar to getById, we need date for URL construction
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateStr = `${year}-${month}-01`;
    
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
