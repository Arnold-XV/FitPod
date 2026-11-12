// apps/web/src/types/shacl-engine.d.ts
declare module 'shacl-engine/Validator.js' {
  import type { DatasetCore, DataFactory, Term } from '@rdfjs/types';
  export interface ValidationReport { conforms: boolean; results: unknown[] }
  export default class Validator {
    constructor(shapes: DatasetCore, options: { factory: DataFactory; debug?: boolean; details?: boolean });
    validate(
      data: { dataset: DatasetCore; terms?: Iterable<Term> },
      shapes?: { terms?: Iterable<Term> },
    ): Promise<ValidationReport>;
  }
}