/**
 * Workout RDF mappers (L4)
 * AR-02: Only L4 imports RDF libraries
 */

import { DataFactory } from 'n3';
import type { Quad } from '@rdfjs/types';
import {
  RDF_TYPE,
  XSD_DATE,
  XSD_DATETIME,
  XSD_INTEGER,
  XSD_DECIMAL,
  FP_WORKOUT_SESSION,
  FP_DATE,
  FP_START_TIME,
  FP_END_TIME,
  FP_ROUTINE_REF,
  FP_EXERCISE_BLOCK,
  FP_EST_KCAL_BURNED,
  FP_NOTE,
  FP_SCHEMA_VERSION,
  FP_EXERCISE_BLOCK_TYPE,
  FP_POSITION,
  FP_EXERCISE_NAME,
  FP_EXERCISE_REF,
  FP_SET_LOG,
  FP_EXERCISE_REF_TYPE,
  FP_EXERCISE_SOURCE,
  FP_EXERCISE_ID,
  FP_SET_LOG_TYPE,
  FP_SET_INDEX,
  FP_WEIGHT_KG,
  FP_REPS,
  FP_REST_SEC,
  FP_RPE,
  FP_ROUTINE,
  FP_NAME,
  FP_DAYS_OF_WEEK,
  FP_CREATED_BY,
  FP_SOURCE_PRESCRIPTION,
  FP_ROUTINE_ITEM,
  FP_ROUTINE_ITEM_TYPE,
  FP_TARGET_SETS,
  FP_TARGET_REPS,
  FP_TARGET_WEIGHT_KG,
  FP_CUSTOM_EXERCISE,
  FP_PRIMARY_MUSCLES,
  FP_EQUIPMENT,
  FP_PROGRESS_RECORDS,
  FP_PERSONAL_RECORD,
  FP_SOURCE_HASH,
  FP_COMPUTED_AT,
  FP_PERSONAL_RECORD_TYPE,
  FP_RECORD_TYPE,
  FP_VALUE,
  FP_ACHIEVED_AT,
  FP_SESSION_REF,
} from '@fitpod/vocab';
import type {
  WorkoutSession,
  ExerciseBlock,
  SetLog,
  ExerciseRef,
  Routine,
  RoutineItem,
  CustomExercise,
  ProgressRecords,
  PersonalRecord,
} from '../../domain/workout/entities';

const { namedNode, literal, blankNode } = DataFactory;

// Helper to create quads (N3 doesn't export quad function)
const makeQuad = (s: any, p: any, o: any): Quad => {
  return { subject: s, predicate: p, object: o, graph: namedNode('') } as Quad;
};

// ══════════════════════════════════════════════════
// Session Mapping
// ══════════════════════════════════════════════════

export function sessionToQuads(
  session: WorkoutSession,
  resourceIRI: string
): Quad[] {
  const subject = namedNode(resourceIRI);
  const quads: Quad[] = [];

  // Type
  quads.push(makeQuad(subject, namedNode(RDF_TYPE), namedNode(FP_WORKOUT_SESSION)));

  // Core fields
  quads.push(makeQuad(subject, namedNode(FP_DATE), literal(session.date, namedNode(XSD_DATE))));
  quads.push(makeQuad(subject, namedNode(FP_START_TIME), literal(session.startTime, namedNode(XSD_DATETIME))));
  quads.push(makeQuad(subject, namedNode(FP_END_TIME), literal(session.endTime, namedNode(XSD_DATETIME))));
  quads.push(makeQuad(subject, namedNode(FP_SCHEMA_VERSION), literal(session.schemaVersion.toString(), namedNode(XSD_INTEGER))));

  // Optional routine reference
  if (session.routineRef) {
    quads.push(makeQuad(subject, namedNode(FP_ROUTINE_REF), namedNode(session.routineRef)));
  }

  // Optional note
  if (session.note) {
    quads.push(makeQuad(subject, namedNode(FP_NOTE), literal(session.note)));
  }

  // Optional calorie estimate
  if (session.estKcalBurned !== undefined) {
    quads.push(makeQuad(subject, namedNode(FP_EST_KCAL_BURNED), literal(session.estKcalBurned.toString(), namedNode(XSD_DECIMAL))));
  }

  // Exercise blocks
  session.exerciseBlocks.forEach(block => {
    const blockNode = blankNode();
    quads.push(makeQuad(subject, namedNode(FP_EXERCISE_BLOCK), blockNode));
    quads.push(...exerciseBlockToQuads(block, blockNode));
  });

  return quads;
}

function exerciseBlockToQuads(block: ExerciseBlock, subject: ReturnType<typeof blankNode>): Quad[] {
  const quads: Quad[] = [];

  quads.push(makeQuad(subject, namedNode(RDF_TYPE), namedNode(FP_EXERCISE_BLOCK_TYPE)));
  quads.push(makeQuad(subject, namedNode(FP_POSITION), literal(block.position.toString(), namedNode(XSD_INTEGER))));
  quads.push(makeQuad(subject, namedNode(FP_EXERCISE_NAME), literal(block.exerciseName)));

  // Exercise reference
  const refNode = blankNode();
  quads.push(makeQuad(subject, namedNode(FP_EXERCISE_REF), refNode));
  quads.push(...exerciseRefToQuads(block.exerciseRef, refNode));

  // Sets
  block.sets.forEach(set => {
    const setNode = blankNode();
    quads.push(makeQuad(subject, namedNode(FP_SET_LOG), setNode));
    quads.push(...setLogToQuads(set, setNode));
  });

  return quads;
}

function exerciseRefToQuads(ref: ExerciseRef, subject: ReturnType<typeof blankNode>): Quad[] {
  return [
    makeQuad(subject, namedNode(RDF_TYPE), namedNode(FP_EXERCISE_REF_TYPE)),
    makeQuad(subject, namedNode(FP_EXERCISE_SOURCE), literal(ref.source)),
    makeQuad(subject, namedNode(FP_EXERCISE_ID), literal(ref.id)),
  ];
}

function setLogToQuads(set: SetLog, subject: ReturnType<typeof blankNode>): Quad[] {
  const quads: Quad[] = [
    makeQuad(subject, namedNode(RDF_TYPE), namedNode(FP_SET_LOG_TYPE)),
    makeQuad(subject, namedNode(FP_SET_INDEX), literal(set.setIndex.toString(), namedNode(XSD_INTEGER))),
    makeQuad(subject, namedNode(FP_WEIGHT_KG), literal(set.weightKg.toString(), namedNode(XSD_DECIMAL))),
    makeQuad(subject, namedNode(FP_REPS), literal(set.reps.toString(), namedNode(XSD_INTEGER))),
  ];

  if (set.restSec !== undefined) {
    quads.push(makeQuad(subject, namedNode(FP_REST_SEC), literal(set.restSec.toString(), namedNode(XSD_INTEGER))));
  }

  if (set.rpe !== undefined) {
    quads.push(makeQuad(subject, namedNode(FP_RPE), literal(set.rpe.toString(), namedNode(XSD_INTEGER))));
  }

  return quads;
}

// ══════════════════════════════════════════════════
// Session Parsing (Quads → Entity)
// ══════════════════════════════════════════════════

export function quadsToSession(quads: Quad[], resourceIRI: string): WorkoutSession | null {
  const subject = namedNode(resourceIRI);
  
  // Extract scalar fields
  const date = findObject(quads, subject, FP_DATE)?.value;
  const startTime = findObject(quads, subject, FP_START_TIME)?.value;
  const endTime = findObject(quads, subject, FP_END_TIME)?.value;
  const schemaVersion = parseInt(findObject(quads, subject, FP_SCHEMA_VERSION)?.value || '1');
  const routineRef = findObject(quads, subject, FP_ROUTINE_REF)?.value;
  const note = findObject(quads, subject, FP_NOTE)?.value;
  const estKcalBurned = parseFloat(findObject(quads, subject, FP_EST_KCAL_BURNED)?.value || '');

  if (!date || !startTime || !endTime) return null;

  // Extract exercise blocks
  const blockNodes = findObjects(quads, subject, FP_EXERCISE_BLOCK);
  const exerciseBlocks = blockNodes
    .map(node => quadsToExerciseBlock(quads, node))
    .filter((b): b is ExerciseBlock => b !== null);

  return {
    id: extractIdFromIRI(resourceIRI),
    date,
    startTime,
    endTime,
    routineRef,
    exerciseBlocks,
    note,
    estKcalBurned: isNaN(estKcalBurned) ? undefined : estKcalBurned,
    schemaVersion,
  };
}

function quadsToExerciseBlock(quads: Quad[], subject: any): ExerciseBlock | null {
  const position = parseInt(findObject(quads, subject, FP_POSITION)?.value || '0');
  const exerciseName = findObject(quads, subject, FP_EXERCISE_NAME)?.value;
  const refNode = findObject(quads, subject, FP_EXERCISE_REF);

  if (!exerciseName || !refNode) return null;

  const exerciseRef = quadsToExerciseRef(quads, refNode);
  if (!exerciseRef) return null;

  const setNodes = findObjects(quads, subject, FP_SET_LOG);
  const sets = setNodes
    .map(node => quadsToSetLog(quads, node))
    .filter((s): s is SetLog => s !== null);

  return { position, exerciseName, exerciseRef, sets };
}

function quadsToExerciseRef(quads: Quad[], subject: any): ExerciseRef | null {
  const source = findObject(quads, subject, FP_EXERCISE_SOURCE)?.value;
  const id = findObject(quads, subject, FP_EXERCISE_ID)?.value;

  if (!source || !id) return null;

  const validSources = ['free-exercise-db', 'wger', 'custom'];
  if (!validSources.includes(source)) return null;

  return { source: source as ExerciseRef['source'], id };
}

function quadsToSetLog(quads: Quad[], subject: any): SetLog | null {
  const setIndex = parseInt(findObject(quads, subject, FP_SET_INDEX)?.value || '0');
  const weightKg = parseFloat(findObject(quads, subject, FP_WEIGHT_KG)?.value || '0');
  const reps = parseInt(findObject(quads, subject, FP_REPS)?.value || '0');
  const restSec = parseInt(findObject(quads, subject, FP_REST_SEC)?.value || '');
  const rpe = parseInt(findObject(quads, subject, FP_RPE)?.value || '');

  return {
    setIndex,
    weightKg,
    reps,
    restSec: isNaN(restSec) ? undefined : restSec,
    rpe: isNaN(rpe) ? undefined : rpe,
  };
}

// ══════════════════════════════════════════════════
// Routine Mapping
// ══════════════════════════════════════════════════

export function routineToQuads(routine: Routine, resourceIRI: string): Quad[] {
  const subject = namedNode(resourceIRI);
  const quads: Quad[] = [];

  quads.push(makeQuad(subject, namedNode(RDF_TYPE), namedNode(FP_ROUTINE)));
  quads.push(makeQuad(subject, namedNode(FP_NAME), literal(routine.name)));
  quads.push(makeQuad(subject, namedNode(FP_CREATED_BY), namedNode(routine.createdBy)));
  quads.push(makeQuad(subject, namedNode(FP_SCHEMA_VERSION), literal(routine.schemaVersion.toString(), namedNode(XSD_INTEGER))));

  if (routine.daysOfWeek) {
    routine.daysOfWeek.forEach(day => {
      quads.push(makeQuad(subject, namedNode(FP_DAYS_OF_WEEK), literal(day.toString(), namedNode(XSD_INTEGER))));
    });
  }

  if (routine.sourcePrescription) {
    quads.push(makeQuad(subject, namedNode(FP_SOURCE_PRESCRIPTION), namedNode(routine.sourcePrescription)));
  }

  routine.items.forEach(item => {
    const itemNode = blankNode();
    quads.push(makeQuad(subject, namedNode(FP_ROUTINE_ITEM), itemNode));
    quads.push(...routineItemToQuads(item, itemNode));
  });

  return quads;
}

function routineItemToQuads(item: RoutineItem, subject: ReturnType<typeof blankNode>): Quad[] {
  const quads: Quad[] = [
    makeQuad(subject, namedNode(RDF_TYPE), namedNode(FP_ROUTINE_ITEM_TYPE)),
    makeQuad(subject, namedNode(FP_POSITION), literal(item.position.toString(), namedNode(XSD_INTEGER))),
    makeQuad(subject, namedNode(FP_EXERCISE_NAME), literal(item.exerciseName)),
  ];

  const refNode = blankNode();
  quads.push(makeQuad(subject, namedNode(FP_EXERCISE_REF), refNode));
  quads.push(...exerciseRefToQuads(item.exerciseRef, refNode));

  if (item.targetSets !== undefined) {
    quads.push(makeQuad(subject, namedNode(FP_TARGET_SETS), literal(item.targetSets.toString(), namedNode(XSD_INTEGER))));
  }

  if (item.targetReps !== undefined) {
    quads.push(makeQuad(subject, namedNode(FP_TARGET_REPS), literal(item.targetReps.toString(), namedNode(XSD_INTEGER))));
  }

  if (item.targetWeightKg !== undefined) {
    quads.push(makeQuad(subject, namedNode(FP_TARGET_WEIGHT_KG), literal(item.targetWeightKg.toString(), namedNode(XSD_DECIMAL))));
  }

  return quads;
}

export function quadsToRoutine(quads: Quad[], resourceIRI: string): Routine | null {
  const subject = namedNode(resourceIRI);
  
  const name = findObject(quads, subject, FP_NAME)?.value;
  const createdBy = findObject(quads, subject, FP_CREATED_BY)?.value;
  const schemaVersion = parseInt(findObject(quads, subject, FP_SCHEMA_VERSION)?.value || '1');
  const sourcePrescription = findObject(quads, subject, FP_SOURCE_PRESCRIPTION)?.value;

  if (!name || !createdBy) return null;

  const daysOfWeek = findObjects(quads, subject, FP_DAYS_OF_WEEK)
    .map(node => parseInt(node.value))
    .filter(n => !isNaN(n));

  const itemNodes = findObjects(quads, subject, FP_ROUTINE_ITEM);
  const items = itemNodes
    .map(node => quadsToRoutineItem(quads, node))
    .filter((i): i is RoutineItem => i !== null);

  return {
    id: extractIdFromIRI(resourceIRI),
    name,
    daysOfWeek: daysOfWeek.length > 0 ? daysOfWeek : undefined,
    createdBy,
    sourcePrescription,
    items,
    schemaVersion,
  };
}

function quadsToRoutineItem(quads: Quad[], subject: any): RoutineItem | null {
  const position = parseInt(findObject(quads, subject, FP_POSITION)?.value || '0');
  const exerciseName = findObject(quads, subject, FP_EXERCISE_NAME)?.value;
  const refNode = findObject(quads, subject, FP_EXERCISE_REF);

  if (!exerciseName || !refNode) return null;

  const exerciseRef = quadsToExerciseRef(quads, refNode);
  if (!exerciseRef) return null;

  const targetSets = parseInt(findObject(quads, subject, FP_TARGET_SETS)?.value || '');
  const targetReps = parseInt(findObject(quads, subject, FP_TARGET_REPS)?.value || '');
  const targetWeightKg = parseFloat(findObject(quads, subject, FP_TARGET_WEIGHT_KG)?.value || '');

  return {
    position,
    exerciseName,
    exerciseRef,
    targetSets: isNaN(targetSets) ? undefined : targetSets,
    targetReps: isNaN(targetReps) ? undefined : targetReps,
    targetWeightKg: isNaN(targetWeightKg) ? undefined : targetWeightKg,
  };
}

// ══════════════════════════════════════════════════
// Custom Exercise Mapping
// ══════════════════════════════════════════════════

export function customExerciseToQuads(exercise: CustomExercise, resourceIRI: string): Quad[] {
  const subject = namedNode(resourceIRI);
  const quads: Quad[] = [];

  quads.push(makeQuad(subject, namedNode(RDF_TYPE), namedNode(FP_CUSTOM_EXERCISE)));
  quads.push(makeQuad(subject, namedNode(FP_NAME), literal(exercise.name)));
  quads.push(makeQuad(subject, namedNode(FP_SCHEMA_VERSION), literal(exercise.schemaVersion.toString(), namedNode(XSD_INTEGER))));

  if (exercise.primaryMuscles) {
    exercise.primaryMuscles.forEach(muscle => {
      quads.push(makeQuad(subject, namedNode(FP_PRIMARY_MUSCLES), literal(muscle)));
    });
  }

  if (exercise.equipment) {
    quads.push(makeQuad(subject, namedNode(FP_EQUIPMENT), literal(exercise.equipment)));
  }

  if (exercise.note) {
    quads.push(makeQuad(subject, namedNode(FP_NOTE), literal(exercise.note)));
  }

  return quads;
}

export function quadsToCustomExercise(quads: Quad[], resourceIRI: string): CustomExercise | null {
  const subject = namedNode(resourceIRI);
  
  const name = findObject(quads, subject, FP_NAME)?.value;
  const schemaVersion = parseInt(findObject(quads, subject, FP_SCHEMA_VERSION)?.value || '1');
  const equipment = findObject(quads, subject, FP_EQUIPMENT)?.value;
  const note = findObject(quads, subject, FP_NOTE)?.value;

  if (!name) return null;

  const primaryMuscles = findObjects(quads, subject, FP_PRIMARY_MUSCLES)
    .map(node => node.value);

  return {
    id: extractIdFromIRI(resourceIRI),
    name,
    primaryMuscles: primaryMuscles.length > 0 ? primaryMuscles : undefined,
    equipment,
    note,
    schemaVersion,
  };
}

// ══════════════════════════════════════════════════
// Progress Records Mapping
// ══════════════════════════════════════════════════

export function recordsToQuads(records: ProgressRecords, resourceIRI: string): Quad[] {
  const subject = namedNode(resourceIRI);
  const quads: Quad[] = [];

  quads.push(makeQuad(subject, namedNode(RDF_TYPE), namedNode(FP_PROGRESS_RECORDS)));
  quads.push(makeQuad(subject, namedNode(FP_SOURCE_HASH), literal(records.sourceHash)));
  quads.push(makeQuad(subject, namedNode(FP_COMPUTED_AT), literal(records.computedAt, namedNode(XSD_DATETIME))));
  quads.push(makeQuad(subject, namedNode(FP_SCHEMA_VERSION), literal(records.schemaVersion.toString(), namedNode(XSD_INTEGER))));

  records.records.forEach(record => {
    const recordNode = blankNode();
    quads.push(makeQuad(subject, namedNode(FP_PERSONAL_RECORD), recordNode));
    quads.push(...personalRecordToQuads(record, recordNode));
  });

  return quads;
}

function personalRecordToQuads(record: PersonalRecord, subject: ReturnType<typeof blankNode>): Quad[] {
  const quads: Quad[] = [
    makeQuad(subject, namedNode(RDF_TYPE), namedNode(FP_PERSONAL_RECORD_TYPE)),
    makeQuad(subject, namedNode(FP_RECORD_TYPE), literal(record.type)),
    makeQuad(subject, namedNode(FP_VALUE), literal(record.value.toString(), namedNode(XSD_DECIMAL))),
    makeQuad(subject, namedNode(FP_ACHIEVED_AT), literal(record.achievedAt, namedNode(XSD_DATETIME))),
    makeQuad(subject, namedNode(FP_SESSION_REF), namedNode(record.sessionRef)),
  ];

  const refNode = blankNode();
  quads.push(makeQuad(subject, namedNode(FP_EXERCISE_REF), refNode));
  quads.push(...exerciseRefToQuads(record.exerciseRef, refNode));

  return quads;
}

export function quadsToRecords(quads: Quad[], resourceIRI: string): ProgressRecords | null {
  const subject = namedNode(resourceIRI);
  
  const sourceHash = findObject(quads, subject, FP_SOURCE_HASH)?.value;
  const computedAt = findObject(quads, subject, FP_COMPUTED_AT)?.value;
  const schemaVersion = parseInt(findObject(quads, subject, FP_SCHEMA_VERSION)?.value || '1');

  if (!sourceHash || !computedAt) return null;

  const recordNodes = findObjects(quads, subject, FP_PERSONAL_RECORD);
  const records = recordNodes
    .map(node => quadsToPersonalRecord(quads, node))
    .filter((r): r is PersonalRecord => r !== null);

  return { records, sourceHash, computedAt, schemaVersion };
}

function quadsToPersonalRecord(quads: Quad[], subject: any): PersonalRecord | null {
  const type = findObject(quads, subject, FP_RECORD_TYPE)?.value;
  const value = parseFloat(findObject(quads, subject, FP_VALUE)?.value || '0');
  const achievedAt = findObject(quads, subject, FP_ACHIEVED_AT)?.value;
  const sessionRef = findObject(quads, subject, FP_SESSION_REF)?.value;
  const refNode = findObject(quads, subject, FP_EXERCISE_REF);

  if (!type || !achievedAt || !sessionRef || !refNode) return null;

  const validTypes = ['maxWeight', 'maxReps', 'est1RM'];
  if (!validTypes.includes(type)) return null;

  const exerciseRef = quadsToExerciseRef(quads, refNode);
  if (!exerciseRef) return null;

  return {
    exerciseRef,
    type: type as PersonalRecord['type'],
    value,
    achievedAt,
    sessionRef,
  };
}

// ══════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════

function findObject(quads: Quad[], subject: any, predicate: string): any | null {
  const quad = quads.find(
    q => q.subject.equals(subject) && q.predicate.value === predicate
  );
  return quad ? quad.object : null;
}

function findObjects(quads: Quad[], subject: any, predicate: string): any[] {
  return quads
    .filter(q => q.subject.equals(subject) && q.predicate.value === predicate)
    .map(q => q.object);
}

function extractIdFromIRI(iri: string): string {
  const parts = iri.split('/');
  const filename = parts[parts.length - 1];
  return filename ? filename.replace('.ttl', '') : '';
}
