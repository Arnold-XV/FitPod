/**
 * Clock port for L3 - no direct Date.now() calls in domain
 * AR-04: L3 murni: tanpa I/O, tanpa Date.now() atau Math.random()
 */

export interface Clock {
  now(): Date;
  nowIso(): string;
}
