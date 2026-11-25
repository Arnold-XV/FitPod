/**
 * Client Recommendation Service Implementation (L4)
 * Manages recommendations received by clients from professionals
 */

import { DataFactory, Store } from 'n3';
import type { ClientRecommendationService } from '@/domain/professional/ports';
import type { RoutineRecommendation, DayRoutine, ExerciseTemplate } from '@/domain/professional/entities';
import type { Result } from '@/domain/shared/result';
import { success, failure, appError } from '@/domain/shared/result';
import type { SolidIo } from '@/data/solid/solid-io';
import {
  FP_ROUTINE_RECOMMENDATION,
  FP_CLIENT_WEB_ID,
  FP_PROFESSIONAL_WEB_ID,
  FP_CREATED_AT,
  FP_STATUS,
  FP_APPLIED_AT,
  FP_REJECTED_AT,
  FP_DAY_ROUTINE,
  FP_DAY_ROUTINE_TYPE,
  FP_DAY_OF_WEEK,
  FP_NAME,
  FP_EXERCISE_TEMPLATE,
  FP_EXERCISE_TEMPLATE_TYPE,
  FP_POSITION,
  FP_EXERCISE_NAME,
  FP_EXERCISE_REF,
  FP_TARGET_SETS,
  FP_TARGET_REPS,
  FP_TARGET_WEIGHT_KG,
  FP_REST_SEC,
  FP_NOTE,
  FP_SCHEMA_VERSION,
  RDF_TYPE,
  XSD_DATETIME,
  XSD_INTEGER,
  XSD_DECIMAL,
} from '@fitpod/vocab';

const { namedNode, literal, blankNode } = DataFactory;

export interface CreateClientRecommendationServiceOptions {
  solidIo: SolidIo;
}

// Shared serialization/parsing functions
const serializeRecommendation = (rec: RoutineRecommendation, url: string): Store => {
  const store = new Store();
  const subject = `${url}#it`;
  
  store.addQuad({
    subject: namedNode(subject),
    predicate: namedNode(RDF_TYPE),
    object: namedNode(FP_ROUTINE_RECOMMENDATION),
  } as any);
  
  store.addQuad({
    subject: namedNode(subject),
    predicate: namedNode(FP_CLIENT_WEB_ID),
    object: namedNode(rec.clientWebId),
  } as any);
  
  store.addQuad({
    subject: namedNode(subject),
    predicate: namedNode(FP_PROFESSIONAL_WEB_ID),
    object: namedNode(rec.professionalWebId),
  } as any);
  
  store.addQuad({
    subject: namedNode(subject),
    predicate: namedNode(FP_CREATED_AT),
    object: literal(rec.createdAt, namedNode(XSD_DATETIME)),
  } as any);
  
  store.addQuad({
    subject: namedNode(subject),
    predicate: namedNode(FP_STATUS),
    object: literal(rec.status),
  } as any);
  
  if (rec.appliedAt) {
    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(FP_APPLIED_AT),
      object: literal(rec.appliedAt, namedNode(XSD_DATETIME)),
    } as any);
  }
  
  if (rec.rejectedAt) {
    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(FP_REJECTED_AT),
      object: literal(rec.rejectedAt, namedNode(XSD_DATETIME)),
    } as any);
  }
  
  if (rec.notes) {
    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(FP_NOTE),
      object: literal(rec.notes),
    } as any);
  }
  
  rec.days.forEach(day => {
    const dayNode = blankNode();
    
    store.addQuad({
      subject: namedNode(subject),
      predicate: namedNode(FP_DAY_ROUTINE),
      object: dayNode,
    } as any);
    
    store.addQuad({
      subject: dayNode,
      predicate: namedNode(RDF_TYPE),
      object: namedNode(FP_DAY_ROUTINE_TYPE),
    } as any);
    
    store.addQuad({
      subject: dayNode,
      predicate: namedNode(FP_DAY_OF_WEEK),
      object: literal(String(day.dayOfWeek), namedNode(XSD_INTEGER)),
    } as any);
    
    store.addQuad({
      subject: dayNode,
      predicate: namedNode(FP_NAME),
      object: literal(day.name),
    } as any);
    
    day.exercises.forEach(exercise => {
      const exerciseNode = blankNode();
      
      store.addQuad({
        subject: dayNode,
        predicate: namedNode(FP_EXERCISE_TEMPLATE),
        object: exerciseNode,
      } as any);
      
      store.addQuad({
        subject: exerciseNode,
        predicate: namedNode(RDF_TYPE),
        object: namedNode(FP_EXERCISE_TEMPLATE_TYPE),
      } as any);
      
      store.addQuad({
        subject: exerciseNode,
        predicate: namedNode(FP_POSITION),
        object: literal(String(exercise.position), namedNode(XSD_INTEGER)),
      } as any);
      
      store.addQuad({
        subject: exerciseNode,
        predicate: namedNode(FP_EXERCISE_NAME),
        object: literal(exercise.exerciseName),
      } as any);
      
      store.addQuad({
        subject: exerciseNode,
        predicate: namedNode(FP_EXERCISE_REF),
        object: literal(`${exercise.exerciseRef.source}:${exercise.exerciseRef.id}`),
      } as any);
      
      store.addQuad({
        subject: exerciseNode,
        predicate: namedNode(FP_TARGET_SETS),
        object: literal(String(exercise.targetSets), namedNode(XSD_INTEGER)),
      } as any);
      
      store.addQuad({
        subject: exerciseNode,
        predicate: namedNode(FP_TARGET_REPS),
        object: literal(exercise.targetReps),
      } as any);
      
      if (exercise.targetWeightKg !== undefined) {
        store.addQuad({
          subject: exerciseNode,
          predicate: namedNode(FP_TARGET_WEIGHT_KG),
          object: literal(String(exercise.targetWeightKg), namedNode(XSD_DECIMAL)),
        } as any);
      }
      
      if (exercise.restSec !== undefined) {
        store.addQuad({
          subject: exerciseNode,
          predicate: namedNode(FP_REST_SEC),
          object: literal(String(exercise.restSec), namedNode(XSD_INTEGER)),
        } as any);
      }
      
      if (exercise.notes) {
        store.addQuad({
          subject: exerciseNode,
          predicate: namedNode(FP_NOTE),
          object: literal(exercise.notes),
        } as any);
      }
    });
  });
  
  store.addQuad({
    subject: namedNode(subject),
    predicate: namedNode(FP_SCHEMA_VERSION),
    object: literal(String(rec.schemaVersion), namedNode(XSD_INTEGER)),
  } as any);

  return store;
};

const parseRecommendation = (store: Store, url: string): RoutineRecommendation => {
  const subject = `${url}#it`;
  const subjectNode = namedNode(subject);
  
  const getValue = (predicate: string): string | undefined => {
    const quads = store.getQuads(subjectNode as any, namedNode(predicate) as any, null, null);
    return quads.length > 0 ? quads[0].object.value : undefined;
  };
  
  const id = url.split('/').pop()?.replace('.ttl', '') ?? '';
  
  const dayQuads = store.getQuads(subjectNode as any, namedNode(FP_DAY_ROUTINE) as any, null, null);
  const days: DayRoutine[] = dayQuads.map(dayQuad => {
    const dayNode = dayQuad.object;
    
    const getDayValue = (pred: string): string | undefined => {
      const quads = store.getQuads(dayNode as any, namedNode(pred) as any, null, null);
      return quads.length > 0 ? quads[0].object.value : undefined;
    };
    
    const dayOfWeek = parseInt(getDayValue(FP_DAY_OF_WEEK) ?? '0');
    const name = getDayValue(FP_NAME) ?? '';
    
    const exerciseQuads = store.getQuads(dayNode as any, namedNode(FP_EXERCISE_TEMPLATE) as any, null, null);
    const exercises: ExerciseTemplate[] = exerciseQuads.map(exQuad => {
      const exNode = exQuad.object;
      
      const getExValue = (pred: string): string | undefined => {
        const quads = store.getQuads(exNode as any, namedNode(pred) as any, null, null);
        return quads.length > 0 ? quads[0].object.value : undefined;
      };
      
      const refStr = getExValue(FP_EXERCISE_REF) ?? 'wger:0';
      const [source, id] = refStr.split(':');
      
      return {
        position: parseInt(getExValue(FP_POSITION) ?? '0'),
        exerciseName: getExValue(FP_EXERCISE_NAME) ?? '',
        exerciseRef: {
          source: (source as 'wger' | 'custom') ?? 'wger',
          id: id ?? '0',
        },
        targetSets: parseInt(getExValue(FP_TARGET_SETS) ?? '3'),
        targetReps: getExValue(FP_TARGET_REPS) ?? '8-12',
        targetWeightKg: getExValue(FP_TARGET_WEIGHT_KG) ? parseFloat(getExValue(FP_TARGET_WEIGHT_KG)!) : undefined,
        restSec: getExValue(FP_REST_SEC) ? parseInt(getExValue(FP_REST_SEC)!) : undefined,
        notes: getExValue(FP_NOTE),
      };
    });
    
    return {
      dayOfWeek,
      name,
      exercises,
    };
  });
  
  return {
    id,
    clientWebId: getValue(FP_CLIENT_WEB_ID) ?? '',
    professionalWebId: getValue(FP_PROFESSIONAL_WEB_ID) ?? '',
    createdAt: getValue(FP_CREATED_AT) ?? '',
    status: (getValue(FP_STATUS) as any) ?? 'pending',
    appliedAt: getValue(FP_APPLIED_AT),
    rejectedAt: getValue(FP_REJECTED_AT),
    days,
    notes: getValue(FP_NOTE),
    schemaVersion: parseInt(getValue(FP_SCHEMA_VERSION) ?? '1'),
  };
};

export const createClientRecommendationService = (
  options: CreateClientRecommendationServiceOptions
): ClientRecommendationService => {
  let webId = '';

  const getInboxUrl = (): string => {
    const url = new URL(webId);
    const storageRoot = `${url.protocol}//${url.host}/`;
    return `${storageRoot}fitpod/recommendations/inbox/`;
  };

  return {
    async listReceivedRecommendations(): Promise<Result<RoutineRecommendation[]>> {
      const inboxUrl = getInboxUrl();
      const listResult = await options.solidIo.listContainer(inboxUrl);
      
      if (!listResult.ok) {
        if (listResult.error.type === 'NotFound') {
          return success([]);
        }
        return listResult;
      }
      
      const recommendations: RoutineRecommendation[] = [];
      for (const childUrl of listResult.value) {
        if (!childUrl.endsWith('.ttl')) continue;
        
        const readResult = await options.solidIo.readTurtle(childUrl);
        if (readResult.ok) {
          try {
            const rec = parseRecommendation(readResult.value.store, childUrl);
            recommendations.push(rec);
          } catch (error) {
            console.error(`Failed to parse recommendation ${childUrl}:`, error);
          }
        }
      }
      
      return success(recommendations);
    },

    async getRecommendation(recId: string, _professionalWebId: string): Promise<Result<RoutineRecommendation | null>> {
      const inboxUrl = getInboxUrl();
      const recUrl = `${inboxUrl}${recId}.ttl`;
      
      const result = await options.solidIo.readTurtle(recUrl);
      
      if (!result.ok) {
        if (result.error.type === 'NotFound') {
          return success(null);
        }
        return result;
      }
      
      try {
        const rec = parseRecommendation(result.value.store, recUrl);
        return success(rec);
      } catch (error) {
        return failure(
          appError(
            'ValidationFailed',
            'Failed to parse recommendation',
            error instanceof Error ? error.message : String(error)
          )
        );
      }
    },

    async applyRecommendation(
      recId: string,
      _professionalWebId: string,
      _daysToApply: number[]
    ): Promise<Result<{ overwritten: number[] }>> {
      const recResult = await this.getRecommendation(recId, _professionalWebId);
      if (!recResult.ok || !recResult.value) {
        return failure(appError('NotFound', 'Recommendation not found'));
      }
      
      const rec = recResult.value;
      
      // For MVP: Mark as applied without actual routine creation
      // TODO: Create routines from recommendation days
      const overwritten: number[] = [];
      
      // Update recommendation status
      const inboxUrl = getInboxUrl();
      const recUrl = `${inboxUrl}${recId}.ttl`;
      
      rec.status = 'applied';
      rec.appliedAt = new Date().toISOString();
      
      const store = serializeRecommendation(rec, recUrl);
      
      const currentResult = await options.solidIo.readTurtle(recUrl);
      if (currentResult.ok && currentResult.value.etag) {
        await options.solidIo.putReplace(recUrl, store, currentResult.value.etag);
      }
      
      return success({ overwritten });
    },

    async rejectRecommendation(recId: string, _professionalWebId: string): Promise<Result<void>> {
      const recResult = await this.getRecommendation(recId, _professionalWebId);
      if (!recResult.ok || !recResult.value) {
        return failure(appError('NotFound', 'Recommendation not found'));
      }
      
      const rec = recResult.value;
      rec.status = 'rejected';
      rec.rejectedAt = new Date().toISOString();
      
      const inboxUrl = getInboxUrl();
      const recUrl = `${inboxUrl}${recId}.ttl`;
      
      const store = serializeRecommendation(rec, recUrl);
      
      const currentResult = await options.solidIo.readTurtle(recUrl);
      if (currentResult.ok && currentResult.value.etag) {
        return await options.solidIo.putReplace(recUrl, store, currentResult.value.etag);
      }
      
      return success(undefined);
    },

    setWebId(newWebId: string): void {
      webId = newWebId;
    },
  };
};
