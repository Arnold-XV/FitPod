/**
 * Exercise library implementation (L5)
 * Loads bundled exercise database from public/data/exercises-en.json
 * AR-02: No RDF imports here (this is not Pod data)
 */

import type { BundledExercise } from '../../domain/workout/entities';
import type { ExerciseLibrary } from '../../domain/workout/ports';

export class BundledExerciseLibrary implements ExerciseLibrary {
  private exercises: BundledExercise[] = [];
  private loaded = false;

  /**
   * Load exercise database from JSON
   */
  async load(): Promise<BundledExercise[]> {
    if (this.loaded) return this.exercises;

    try {
      const response = await fetch('/data/exercises-en.json');
      if (!response.ok) {
        throw new Error(`Failed to load exercises: ${response.status}`);
      }

      const data = await response.json();
      this.exercises = data.exercises || [];
      this.loaded = true;

      console.log(`✓ Loaded ${this.exercises.length} exercises from database`);
      return this.exercises;
    } catch (error) {
      console.error('Failed to load exercise database:', error);
      throw error;
    }
  }

  /**
   * Search exercises by name
   * Simple substring match, case-insensitive
   */
  search(query: string, limit = 50): BundledExercise[] {
    if (!this.loaded) {
      console.warn('Exercise library not loaded, call load() first');
      return [];
    }

    const normalized = query.toLowerCase().trim();
    if (!normalized) return this.exercises.slice(0, limit);

    return this.exercises
      .filter(ex => ex.name.toLowerCase().includes(normalized))
      .slice(0, limit);
  }

  /**
   * Get exercise by ID
   */
  getById(id: string): BundledExercise | null {
    if (!this.loaded) return null;
    return this.exercises.find(ex => ex.id === id) || null;
  }

  /**
   * Filter by criteria
   */
  filter(
    criteria: {
      equipment?: string;
      category?: string;
      bodyPart?: string;
      primaryMuscle?: string;
    },
    limit = 100
  ): BundledExercise[] {
    if (!this.loaded) return [];

    let results = this.exercises;

    if (criteria.equipment) {
      results = results.filter(ex => 
        ex.equipment.toLowerCase() === criteria.equipment!.toLowerCase()
      );
    }

    if (criteria.category) {
      results = results.filter(ex => 
        ex.category.toLowerCase() === criteria.category!.toLowerCase()
      );
    }

    if (criteria.bodyPart) {
      results = results.filter(ex => 
        ex.body_part.toLowerCase() === criteria.bodyPart!.toLowerCase()
      );
    }

    if (criteria.primaryMuscle) {
      results = results.filter(ex =>
        ex.target.toLowerCase() === criteria.primaryMuscle!.toLowerCase()
      );
    }

    return results.slice(0, limit);
  }

  /**
   * Get unique equipment types
   */
  getUniqueEquipment(): string[] {
    if (!this.loaded) return [];
    const unique = new Set(this.exercises.map(ex => ex.equipment));
    return Array.from(unique).sort();
  }

  /**
   * Get unique categories
   */
  getUniqueCategories(): string[] {
    if (!this.loaded) return [];
    const unique = new Set(this.exercises.map(ex => ex.category));
    return Array.from(unique).sort();
  }

  /**
   * Get unique body parts
   */
  getUniqueBodyParts(): string[] {
    if (!this.loaded) return [];
    const unique = new Set(this.exercises.map(ex => ex.body_part));
    return Array.from(unique).sort();
  }

  /**
   * Check if library is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get total exercise count
   */
  count(): number {
    return this.exercises.length;
  }
}

/**
 * Singleton instance (initialized in container)
 */
export const exerciseLibrary = new BundledExerciseLibrary();
