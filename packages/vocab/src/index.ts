/**
 * FitPod vocabulary and RDF namespaces (OQ-8).
 * Single source of truth for all IRIs used across the app.
 */

export const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
export const XSD = 'http://www.w3.org/2001/XMLSchema#';
export const LDP = 'http://www.w3.org/ns/ldp#';
export const ACL = 'http://www.w3.org/ns/auth/acl#';
export const FOAF = 'http://xmlns.com/foaf/0.1/';
export const VCARD = 'http://www.w3.org/2006/vcard/ns#';
export const SCHEMA = 'https://schema.org/';
export const AS = 'https://www.w3.org/ns/activitystreams#';
export const PROV = 'http://www.w3.org/ns/prov#';
export const SOLID = 'http://www.w3.org/ns/solid/terms#';
export const PIM = 'http://www.w3.org/ns/pim/space#';
export const DCT = 'http://purl.org/dc/terms/';

/** FitPod application namespace. */
export const FP = 'https://w3id.org/fitpod/ns#';

/** Build an `fp:` IRI. */
export const fp = (name: string): string => `${FP}${name}`;

/** Build an `acl:` IRI. */
export const acl = (name: string): string => `${ACL}${name}`;

/** Build an `ldp:` IRI. */
export const ldp = (name: string): string => `${LDP}${name}`;

/** Build a `solid:` IRI. */
export const solid = (name: string): string => `${SOLID}${name}`;

/** Build an `xsd:` IRI. */
export const xsd = (name: string): string => `${XSD}${name}`;

/** Build an `rdf:` IRI. */
export const rdf = (name: string): string => `${RDF}${name}`;

export const RDF_TYPE = `${RDF}type`;
export const XSD_STRING = `${XSD}string`;
export const XSD_INTEGER = `${XSD}integer`;
export const XSD_DECIMAL = `${XSD}decimal`;
export const XSD_BOOLEAN = `${XSD}boolean`;
export const XSD_DATE = `${XSD}date`;
export const XSD_DATETIME = `${XSD}dateTime`;

/** Current schema version stamped on every primary subject (FR-POD-09). */
export const SCHEMA_VERSION = 1;

// ══════════════════════════════════════════════════
// Workout Module Vocabulary
// ══════════════════════════════════════════════════

// Workout session
export const FP_WORKOUT_SESSION = fp('WorkoutSession');
export const FP_START_TIME = fp('startTime');
export const FP_END_TIME = fp('endTime');
export const FP_ROUTINE_REF = fp('routineRef');
export const FP_EXERCISE_BLOCK = fp('exerciseBlock');
export const FP_EST_KCAL_BURNED = fp('estKcalBurned');

// Exercise block
export const FP_EXERCISE_BLOCK_TYPE = fp('ExerciseBlock');
export const FP_POSITION = fp('position');
export const FP_EXERCISE_NAME = fp('exerciseName');
export const FP_EXERCISE_REF = fp('exerciseRef');
export const FP_SET_LOG = fp('setLog');

// Set log
export const FP_SET_LOG_TYPE = fp('SetLog');
export const FP_SET_INDEX = fp('setIndex');
export const FP_WEIGHT_KG = fp('weightKg');
export const FP_REPS = fp('reps');
export const FP_REST_SEC = fp('restSec');
export const FP_RPE = fp('rpe');

// Exercise reference
export const FP_EXERCISE_REF_TYPE = fp('ExerciseRef');
export const FP_EXERCISE_SOURCE = fp('exerciseSource');
export const FP_EXERCISE_ID = fp('exerciseId');

// Routine
export const FP_ROUTINE = fp('Routine');
export const FP_DAYS_OF_WEEK = fp('daysOfWeek');
export const FP_CREATED_BY = fp('createdBy');
export const FP_SOURCE_PRESCRIPTION = fp('sourcePrescription');
export const FP_ROUTINE_ITEM = fp('routineItem');

// Routine item
export const FP_ROUTINE_ITEM_TYPE = fp('RoutineItem');
export const FP_TARGET_SETS = fp('targetSets');
export const FP_TARGET_REPS = fp('targetReps');
export const FP_TARGET_WEIGHT_KG = fp('targetWeightKg');

// Custom exercise
export const FP_CUSTOM_EXERCISE = fp('CustomExercise');
export const FP_PRIMARY_MUSCLES = fp('primaryMuscles');
export const FP_EQUIPMENT = fp('equipment');

// Progress records
export const FP_PROGRESS_RECORDS = fp('ProgressRecords');
export const FP_PERSONAL_RECORD = fp('personalRecord');
export const FP_SOURCE_HASH = fp('sourceHash');
export const FP_COMPUTED_AT = fp('computedAt');

// Personal record
export const FP_PERSONAL_RECORD_TYPE = fp('PersonalRecord');
export const FP_RECORD_TYPE = fp('recordType');
export const FP_VALUE = fp('value');
export const FP_ACHIEVED_AT = fp('achievedAt');
export const FP_SESSION_REF = fp('sessionRef');

// Common fields (reused from body module)
export const FP_DATE = fp('date');
export const FP_NAME = fp('name');
export const FP_NOTE = fp('note');
export const FP_SCHEMA_VERSION = fp('schemaVersion');

// ══════════════════════════════════════════════════
// Access Control Module Vocabulary
// ══════════════════════════════════════════════════

// Access Grant
export const FP_ACCESS_GRANT = fp('AccessGrant');
export const FP_GRANTED_TO = fp('grantedTo');
export const FP_GRANTED_BY = fp('grantedBy');
export const FP_SCOPE = fp('scope');
export const FP_PERMISSIONS = fp('permissions');
export const FP_EXPIRES_AT = fp('expiresAt');
export const FP_CREATED_AT = fp('createdAt');
export const FP_REVOKED_AT = fp('revokedAt');

// Access Request
export const FP_ACCESS_REQUEST = fp('AccessRequest');
export const FP_REQUESTED_BY = fp('requestedBy');
export const FP_REQUESTED_FROM = fp('requestedFrom');
export const FP_STATUS = fp('status');
export const FP_MESSAGE = fp('message');
export const FP_RESPONDED_AT = fp('respondedAt');

// ══════════════════════════════════════════════════
// PAR-Q+ Vocabulary
// ══════════════════════════════════════════════════

export const FP_PARQ_RESPONSE = fp('ParQResponse');
export const FP_Q1 = fp('q1');
export const FP_Q2 = fp('q2');
export const FP_Q3 = fp('q3');
export const FP_Q4 = fp('q4');
export const FP_Q5 = fp('q5');
export const FP_Q6 = fp('q6');
export const FP_Q7 = fp('q7');
export const FP_FOLLOW_UP_COMPLETED = fp('followUpCompleted');
export const FP_PROFESSIONAL_CLEARANCE = fp('professionalClearance');
export const FP_CLEARED = fp('cleared');
export const FP_CLEARED_BY = fp('clearedBy');
export const FP_CLEARED_AT = fp('clearedAt');

// ══════════════════════════════════════════════════
// Routine Recommendation Vocabulary
// ══════════════════════════════════════════════════

export const FP_ROUTINE_RECOMMENDATION = fp('RoutineRecommendation');
export const FP_CLIENT_WEB_ID = fp('clientWebId');
export const FP_PROFESSIONAL_WEB_ID = fp('professionalWebId');
export const FP_APPLIED_AT = fp('appliedAt');
export const FP_REJECTED_AT = fp('rejectedAt');
export const FP_DAY_ROUTINE = fp('dayRoutine');

export const FP_DAY_ROUTINE_TYPE = fp('DayRoutine');
export const FP_DAY_OF_WEEK = fp('dayOfWeek');

export const FP_EXERCISE_TEMPLATE = fp('exerciseTemplate');
export const FP_EXERCISE_TEMPLATE_TYPE = fp('ExerciseTemplate');

/** Prefix map used when serialising Turtle. */
export const PREFIXES: Record<string, string> = {
  fp: FP,
  rdf: RDF,
  xsd: XSD,
  ldp: LDP,
  acl: ACL,
  foaf: FOAF,
  vcard: VCARD,
  schema: SCHEMA,
  as: AS,
  prov: PROV,
  solid: SOLID,
  pim: PIM,
  dct: DCT,
};
