import { DataFactory, Parser, Store } from 'n3';
import type { SolidIo } from '@/data/solid/solid-io';
import type { Result } from '@/domain/shared/result';

export type WorkoutExercise = { name: string; targetSets: number; targetReps: number; targetWeight: number };
export type WorkoutPlan = { id: number; name: string; days: string; exercises: WorkoutExercise[] };
export type WorkoutTemplate = WorkoutPlan;
export type WorkoutSessionRecord = { id: string; date: string; planId: number; planName: string; day: string; sets: Record<string, { reps: string; weight: string }[]>; shared: boolean };

const { namedNode, literal } = DataFactory;
const FP = 'https://w3id.org/fitpod/ns#';

export class WorkoutRepository {
  private root = '';
  private ready = false;
  // Plans and templates share one Turtle resource. Serialize writes so each
  // conditional ETag update sees the result of the prior write.
  private saveQueue: Promise<unknown> = Promise.resolve();
  constructor(private io: SolidIo, private webId: string) {}
  private async ensureRoot() {
    if (this.ready) return;
    const response = await this.io.getHttp().authed(this.webId, { headers: { Accept: 'text/turtle' } });
    const text = response.ok ? await response.text() : '';
    const store = new Store();
    await new Promise<void>((resolve) => new Parser({ baseIRI: this.webId }).parse(text, (_error, quad) => { if (quad) store.addQuad(quad); else resolve(); }));
    const storage = store.getQuads(this.webId, 'http://www.w3.org/ns/pim/space#storage', null, null)[0]?.object.value;
    if (storage) {
      this.root = storage;
    } else {
      // Local CSS WebIDs are /<username>/profile/card#me. The Pod root is
      // /<username>/, never the server host root.
      const webIdUrl = new URL(this.webId);
      const username = webIdUrl.pathname.split('/').filter(Boolean)[0];
      this.root = username
        ? `${webIdUrl.protocol}//${webIdUrl.host}/${username}/`
        : `${webIdUrl.origin}/`;
    }
    console.log('[WorkoutRepository] Storage root:', this.root);
    this.ready = true;
  }
  private url() { return `${this.root}fitpod/routines/workouts.ttl`; }
  private encode(subject: string, plans: WorkoutPlan[], templates: WorkoutTemplate[]) {
    const store = new Store();
    [...plans.map((p) => ({ ...p, kind: 'plan' })), ...templates.map((p) => ({ ...p, kind: 'template' }))].forEach((item) => {
      const node = namedNode(`${subject}#${item.kind}-${item.id}`);
      store.addQuad({
        subject: node,
        predicate: namedNode(`${FP}kind`),
        object: literal(item.kind)
      } as any);
      store.addQuad({
        subject: node,
        predicate: namedNode(`${FP}name`),
        object: literal(item.name)
      } as any);
      store.addQuad({
        subject: node,
        predicate: namedNode(`${FP}json`),
        object: literal(JSON.stringify(item))
      } as any);
    });
    return Promise.resolve(store);
  }
  async load(): Promise<{ plans: WorkoutPlan[]; templates: WorkoutTemplate[] }> {
    await this.ensureRoot(); const result = await this.io.readTurtle(this.url());
    if (!result.ok) return { plans: [], templates: [] };
    const items = result.value.store.getQuads(null, namedNode(`${FP}json`), null, null).map((q) => JSON.parse(q.object.value) as WorkoutPlan & { kind: string });
    return { plans: items.filter((x) => x.kind === 'plan'), templates: items.filter((x) => x.kind === 'template') };
  }
  async save(plans: WorkoutPlan[], templates: WorkoutTemplate[]) {
    const write = async () => {
      await this.ensureRoot();
      const url = this.url();
      const store = await this.encode(url, plans, templates);

      // Retry once after a fresh ETag read if another tab/write won race.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const existing = await this.io.readTurtle(url);
        const result = existing.ok && existing.value.etag
          ? await this.io.putReplace(url, store, existing.value.etag)
          : await this.io.putNew(url, store);

        if (result.ok) {
          return result;
        }

        // If 412 on last attempt, force overwrite (file might be in inconsistent state)
        if (result.error.type === 'Conflict' && attempt === 1) {
          console.warn('[WorkoutRepository] ETag conflict, forcing overwrite');
          const fallbackResult = await this.io.putForce(url, store);
          return fallbackResult;
        }

        if (result.error.type !== 'Conflict' || attempt === 1) {
          return result;
        }
      }

      throw new Error('Unreachable save state');
    };

    const result = this.saveQueue.then(write, write);
    // Keep later saves working after a failed write.
    this.saveQueue = result.then(() => undefined, () => undefined);
    return result;
  }
  async saveSession(session: WorkoutSessionRecord) {
    await this.ensureRoot();
    const sessionsContainer = `${this.root}fitpod/sessions/`;
    
    console.log('[WorkoutRepository] Saving session:', { sessionId: session.id, url: `${sessionsContainer}${session.id}.ttl` });
    
    // Ensure sessions container exists
    const http = this.io.getHttp();
    const checkResponse = await http.authed(sessionsContainer, { method: 'HEAD' });
    if (!checkResponse.ok && checkResponse.status === 404) {
      console.log('[WorkoutRepository] Creating sessions container');
      await http.authed(sessionsContainer, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/turtle',
          'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
        },
        body: '',
      });
    }
    
    const url = `${sessionsContainer}${session.id}.ttl`;
    const store = new Store();
    const subject = namedNode(url);
    
    // Add quads directly to store
    store.addQuad({
      subject,
      predicate: namedNode(`${FP}kind`),
      object: literal('session')
    } as any);
    
    store.addQuad({
      subject,
      predicate: namedNode(`${FP}json`),
      object: literal(JSON.stringify(session))
    } as any);
    
    console.log('[WorkoutRepository] Store quads count:', store.getQuads(null, null, null, null).length);
    console.log('[WorkoutRepository] Writing to Pod:', url);
    
    // Allow overwrite same day session - read ETag first
    const existing = await this.io.readTurtle(url);
    const result = existing.ok && existing.value.etag ? await this.io.putReplace(url, store, existing.value.etag) : await this.io.putNew(url, store);
    
    console.log('[WorkoutRepository] Save result:', result);
    return result;
  }
  async loadSession(sessionId: string): Promise<WorkoutSessionRecord | null> {
    await this.ensureRoot();
    const url = `${this.root}fitpod/sessions/${sessionId}.ttl`;
    console.log('[WorkoutRepository] Loading session:', { sessionId, url });
    const result = await this.io.readTurtle(url);
    console.log('[WorkoutRepository] Load result:', result.ok ? 'found' : 'not found', result);
    if (!result.ok) return null;
    
    // Debug: show all quads
    const allQuads = result.value.store.getQuads(null, null, null, null);
    console.log('[WorkoutRepository] All quads in store:', allQuads.length, allQuads);
    
    const quads = result.value.store.getQuads(null, namedNode(`${FP}json`), null, null);
    console.log('[WorkoutRepository] JSON quads:', quads, 'predicate:', `${FP}json`);
    const json = quads[0]?.object.value;
    console.log('[WorkoutRepository] Parsed JSON string:', json);
    const parsed = json ? JSON.parse(json) : null;
    console.log('[WorkoutRepository] Parsed session:', parsed);
    return parsed;
  }
  async deleteSession(sessionId: string): Promise<Result<void>> {
    await this.ensureRoot();
    const url = `${this.root}fitpod/sessions/${sessionId}.ttl`;
    console.log('[WorkoutRepository] Deleting session:', { sessionId, url });
    return await this.io.deleteResource(url);
  }
}

export const createWorkoutRepository = (io: SolidIo, webId: string) => new WorkoutRepository(io, webId);
