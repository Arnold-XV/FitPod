/**
 * SHACL shapes for FitPod resources.
 *
 * These are exported as Turtle so they can be served from C5 and consumed by
 * external validators. The in-app guard performs an equivalent, dependency-free
 * subset check (size, required predicates, ranges, enums) in
 * `apps/web/src/data/validation/`.
 */

import { ACL, FP, RDF, XSD } from '@fitpod/vocab';

const preamble = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <${XSD}> .
@prefix fp: <${FP}> .
@prefix rdf: <${RDF}> .
`;

/** Shared provenance shape (SAD 8.7). */
export const PROVENANCE_SHAPE = `${preamble}
fp:ProvenanceShape a sh:NodeShape ;
  sh:targetClass fp:BodyMeasurement ;
  sh:property [ sh:path fp:trustLevel ; sh:in ( "self" "measured" "clinician" ) ; sh:minCount 1 ] ;
  sh:property [ sh:path <http://www.w3.org/ns/prov#wasAttributedTo> ; sh:minCount 1 ] .
`;

export const BODY_MEASUREMENT_SHAPE = `${preamble}
fp:BodyMeasurementShape a sh:NodeShape ;
  sh:targetClass fp:BodyMeasurement ;
  sh:property [ sh:path fp:weightKg ; sh:minInclusive 20 ; sh:maxInclusive 400 ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:heightCm ; sh:minInclusive 50 ; sh:maxInclusive 260 ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:bodyFatPct ; sh:minInclusive 0 ; sh:maxInclusive 100 ] ;
  sh:property [ sh:path fp:schemaVersion ; sh:minCount 1 ; sh:datatype xsd:integer ] .
`;

export const FOOD_ENTRY_SHAPE = `${preamble}
fp:FoodEntryShape a sh:NodeShape ;
  sh:targetClass fp:FoodEntry ;
  sh:property [ sh:path fp:quantityG ; sh:minExclusive 0 ; sh:maxInclusive 10000 ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:kcal ; sh:minInclusive 0 ; sh:maxInclusive 10000 ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:meal ; sh:in ( "breakfast" "lunch" "dinner" "snack" ) ; sh:minCount 1 ] .
`;

export const WORKOUT_SESSION_SHAPE = `${preamble}
fp:WorkoutSessionShape a sh:NodeShape ;
  sh:targetClass fp:WorkoutSession ;
  sh:property [ sh:path fp:date ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:startTime ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:endTime ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:exercise ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:note ; sh:maxLength 2000 ] .
`;

export const ACCESS_GRANT_SHAPE = `${preamble}
fp:AccessGrantShape a sh:NodeShape ;
  sh:targetClass fp:AccessGrant ;
  sh:property [ sh:path fp:granteeWebId ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:role ; sh:in ( "trainer" "dietitian" "doctor" ) ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:status ; sh:in ( "active" "expired" "revoked" ) ; sh:minCount 1 ] .
`;

export const TRAINER_SUMMARY_SHAPE = `${preamble}
fp:TrainerSummaryShape a sh:NodeShape ;
  sh:targetClass fp:TrainerSummary ;
  sh:property [ sh:path fp:clearanceStatus ; sh:in ( "cleared" "clearanceRecommended" "notScreened" ) ; sh:minCount 1 ] ;
  sh:property [ sh:path fp:generatedAt ; sh:minCount 1 ] .
`;

export const ALL_SHAPES: Record<string, string> = {
  provenance: PROVENANCE_SHAPE,
  body: BODY_MEASUREMENT_SHAPE,
  nutrition: FOOD_ENTRY_SHAPE,
  workout: WORKOUT_SESSION_SHAPE,
  access: ACCESS_GRANT_SHAPE,
  health: TRAINER_SUMMARY_SHAPE,
};

/** Owner-only baseline ACL (AR-21). */
export const ownerAclTemplate = (ownerWebId: string, target: string): string => `@prefix acl: <${ACL}> .

<#owner> a acl:Authorization ;
  acl:agent <${ownerWebId}> ;
  acl:accessTo <${target}> ;
  acl:default <${target}> ;
  acl:mode acl:Read, acl:Write, acl:Control .
`;
