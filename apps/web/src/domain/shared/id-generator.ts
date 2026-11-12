/**
 * ID Generator port for L3
 * AR-04: L3 tidak boleh memanggil crypto.randomUUID langsung
 */

export interface IdGenerator {
  generate(): string;
}
