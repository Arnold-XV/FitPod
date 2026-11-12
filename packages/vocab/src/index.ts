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

export const RDF_TYPE = `${RDF}type`;
export const XSD_STRING = `${XSD}string`;
export const XSD_INTEGER = `${XSD}integer`;
export const XSD_DECIMAL = `${XSD}decimal`;
export const XSD_BOOLEAN = `${XSD}boolean`;
export const XSD_DATE = `${XSD}date`;
export const XSD_DATETIME = `${XSD}dateTime`;

/** Current schema version stamped on every primary subject (FR-POD-09). */
export const SCHEMA_VERSION = 1;

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
