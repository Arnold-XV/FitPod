/**
 * Custom Exercise Repository Implementation (L4)
 */

import { Store } from 'n3';
import type { CustomExerciseRepository } from '@/domain/workout/ports';
import type { CustomExercise } from '@/domain/workout/entities';
import { validateCustomExercise } from '@/domain/workout/validators';
import { appError, failure, success, type Result } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';
import { customExerciseToQuads, quadsToCustomExercise } from './mappers';

interface CustomExerciseRepositoryConfig {
  solidIo: SolidIo;
  storageRoot?: string;
}

class CustomExerciseRepositoryImpl implements CustomExerciseRepository {
  private solidIo: SolidIo;
  private _storageRoot: string = '';

  constructor(config: CustomExerciseRepositoryConfig) {
    this.solidIo = config.solidIo;
    if (config.storageRoot) {
      this._storageRoot = config.storageRoot;
    }
  }

  setStorageRoot(root: string): void {
    this._storageRoot = root;
  }

  private getExerciseContainerUrl(): string {
    return `${this._storageRoot}fitpod/workout/exercises/`;
  }

  private getResourceUrl(id: string): string {
    return `${this.getExerciseContainerUrl()}${id}.ttl`;
  }

  async add(exercise: CustomExercise): Promise<Result<void>> {
    const domainValidation = validateCustomExercise(exercise);
    if (!domainValidation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid exercise data', domainValidation.errors)
      );
    }

    const url = this.getResourceUrl(exercise.id);
    const quads = customExerciseToQuads(exercise, `${url}#it`);
    const store = new Store();
    quads.forEach(q => store.addQuad(q));

    return await this.solidIo.putNew(url, store);
  }

  async update(exercise: CustomExercise): Promise<Result<void>> {
    const domainValidation = validateCustomExercise(exercise);
    if (!domainValidation.valid) {
      return failure(
        appError('ValidationFailed', 'Invalid exercise data', domainValidation.errors)
      );
    }

    const url = this.getResourceUrl(exercise.id);
    const currentResult = await this.solidIo.readTurtle(url);
    if (!currentResult.ok) {
      return failure(currentResult.error);
    }

    const { etag } = currentResult.value;
    if (!etag) {
      return failure(appError('Conflict', 'No ETag found for conditional update'));
    }

    const quads = customExerciseToQuads(exercise, `${url}#it`);
    const store = new Store();
    quads.forEach(q => store.addQuad(q));
    return await this.solidIo.putReplace(url, store, etag);
  }

  async delete(id: string): Promise<Result<void>> {
    const url = this.getResourceUrl(id);
    return await this.solidIo.deleteResource(url);
  }

  async get(id: string): Promise<Result<CustomExercise>> {
    const url = this.getResourceUrl(id);
    const result = await this.solidIo.readTurtle(url);

    if (!result.ok) {
      return failure(result.error);
    }

    try {
      const exercise = quadsToCustomExercise(result.value.store.getQuads(null, null, null, null), `${url}#it`);
      if (!exercise) {
        return failure(appError('ValidationFailed', 'Failed to parse exercise'));
      }
      return success(exercise);
    } catch (error) {
      return failure(
        appError(
          'ValidationFailed',
          'Failed to parse exercise',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }

  async list(): Promise<Result<CustomExercise[]>> {
    const exercises: CustomExercise[] = [];
    
    try {
      const containerUrl = this.getExerciseContainerUrl();
      const listResult = await this.solidIo.listContainer(containerUrl);
      
      if (!listResult.ok) {
        return success([]);
      }

      const readPromises = listResult.value.map(async (resourceUrl) => {
        const result = await this.solidIo.readTurtle(resourceUrl);
        if (!result.ok) return null;
        
        try {
          return quadsToCustomExercise(result.value.store.getQuads(null, null, null, null), `${resourceUrl}#it`);
        } catch (error) {
          console.warn(`Failed to parse ${resourceUrl}:`, error);
          return null;
        }
      });
      
      const results = await Promise.all(readPromises);
      exercises.push(...results.filter((e): e is CustomExercise => e !== null));

      return success(exercises);
    } catch (error) {
      return failure(
        appError(
          'NetworkError',
          'Failed to list custom exercises',
          error instanceof Error ? error.message : String(error)
        )
      );
    }
  }
}

export const createCustomExerciseRepository = (config: CustomExerciseRepositoryConfig): CustomExerciseRepository => {
  return new CustomExerciseRepositoryImpl(config);
};
