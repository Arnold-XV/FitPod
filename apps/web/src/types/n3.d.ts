declare module 'n3' {
  export class Parser {
    constructor(options?: any);
    parse(text: string, callback: (error: Error | null, quad: any, prefixes: any) => void): void;
  }

  export class Writer {
    constructor(options?: any);
    addQuad(quad: any): void;
    addQuads(quads: any[]): void;
    end(callback: (error: Error | null, result: string) => void): void;
  }

  export class Store {
    constructor();
    size: number;
    addQuad(quad: any): void;
    getQuads(subject: any, predicate: any, object: any, graph: any): any[];
  }

  export const DataFactory: {
    namedNode(uri: string): any;
    literal(value: string, languageOrDatatype?: any): any;
    blankNode(label?: string): any;
  };
}
