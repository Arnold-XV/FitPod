import React, { useEffect, useMemo, useState } from 'react';
import { container } from '@/app/container';
import { useAuth } from '../hooks/useAuth';
import type { SharedActivity } from '@/domain/social/entities';
import type { WorkoutSession, ExerciseBlock, SetLog } from '@/domain/workout/entities';
import { calculateVolume } from '@/domain/workout/calculators';
import { AppShell } from '../components/layout/AppShell';
import { PageWrapper } from '../components/layout/PageWrapper';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';

import type { WorkoutExercise as Exercise, WorkoutPlan as Plan } from '@/data/repositories/workout/workout-repository';

const initialPlans: Plan[] = [];

const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

const toSessionRecord = (session: WorkoutSession, planId: number, planName: string, shared: boolean) => ({
  id: session.id,
  date: session.date,
  planId,
  planName,
  day: session.date,
  sets: Object.fromEntries(session.exerciseBlocks.map((block) => [
    block.exerciseName,
    block.sets.map((set) => ({ reps: String(set.reps), weight: String(set.weightKg) })),
  ])),
  shared,
});

const fromSessionRecord = (record: { id: string; date: string; sets: Record<string, { reps: string; weight: string }[]> }): WorkoutSession => ({
  id: record.id,
  date: record.date,
  startTime: `${record.date}T00:00:00.000Z`,
  endTime: `${record.date}T00:00:00.000Z`,
  exerciseBlocks: Object.entries(record.sets).map(([exerciseName, sets], index) => ({
    position: index + 1,
    exerciseName,
    exerciseRef: { source: 'custom' as const, id: exerciseName.toLowerCase().replace(/\s+/g, '-') },
    sets: sets.map((set, setIndex) => ({ setIndex: setIndex + 1, reps: Number(set.reps) || 0, weightKg: Number(set.weight) || 0 })),
  })),
  schemaVersion: 1,
});

export const WorkoutPage = () => {
  const [plans, setPlans] = useState(initialPlans);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<'new' | 'template'>('new');
  const [templates, setTemplates] = useState<Plan[]>([]);
  const [templateId, setTemplateId] = useState<number | ''>('');
  const [planName, setPlanName] = useState('');
  const [exerciseName, setExerciseName] = useState('');
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [share, setShare] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const { webId } = useAuth();
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const plan = plans.find((item) => item.id === selectedPlanId);

  useEffect(() => {
    container.getWorkoutRepository().then((repository) => repository.load()).then((data) => {
      setPlans(data.plans); setTemplates(data.templates); setSelectedPlanId(data.plans[0]?.id ?? null);
    }).catch(() => undefined);
  }, []);

  const persist = async (nextPlans = plans, nextTemplates = templates) => {
    try { await (await container.getWorkoutRepository()).save(nextPlans, nextTemplates); } catch { /* UI remains usable when Pod unavailable */ }
  };

  const saveSession = async () => {
    if (!plan || saving || saved || !session) return;
    setSaving(true);
    const sessionId = `${selectedDay}-${plan.id}`;
    const record = toSessionRecord({ ...session, id: sessionId }, plan.id, plan.name, share);
    
    console.log('[WorkoutPage] Saving session:', { sessionId, planId: plan.id, record });
    
    try {
      await (await container.getWorkoutRepository()).saveSession(record);
      console.log('[WorkoutPage] Session saved successfully');
      
      if (share && webId) {
        const now = new Date();
        const activityId = `workout-${selectedDay}-${plan.id}-${now.getTime()}`;
        const activity: SharedActivity = {
          id: activityId,
          authorWebId: webId,
          date: new Date(selectedDay).toISOString(),
          title: `${plan.name} selesai`,
          durationMin: 0,
          totalVolumeKg: calculateVolume(session),
          exerciseNames: session.exerciseBlocks.map((block) => block.exerciseName),
          visibility: 'friends',
          schemaVersion: 1
        };
        const social = await container.getSocialRepository();
        const result = await social.addSharedActivity(activity);
        if (!result.ok) {
          console.error('[WorkoutPage] Failed to share activity:', result.error);
          window.alert(`Sesi tersimpan, tapi gagal dibagikan ke feed: ${result.error.message}`);
        }
      }
      
      setSaved(true);
      window.alert('Sesi berhasil disimpan ke Pod!' + (share ? ' Dan dibagikan ke feed teman.' : ''));
      
      // Force reload session after save
      setTimeout(async () => {
        console.log('[WorkoutPage] Reloading session after save');
        const repo = await container.getWorkoutRepository();
        const reloaded = await repo.loadSession(sessionId);
        console.log('[WorkoutPage] Reloaded session:', reloaded);
      }, 1000);
    } catch (error) { 
      console.error('[WorkoutPage] Save error:', error);
      window.alert(`Sesi gagal disimpan ke Pod: ${error instanceof Error ? error.message : 'Unknown error'}`); 
    } finally { 
      setSaving(false); 
    }
  };

  // Load session for current day + plan
  useEffect(() => {
    if (!plan || !selectedDay) return;
    const sessionId = `${selectedDay}-${plan.id}`;
    
    console.log('[WorkoutPage] Loading session:', { sessionId, planId: plan.id, planName: plan.name, selectedDay });
    
    container.getWorkoutRepository()
      .then((repo) => repo.loadSession(sessionId))
      .then((record) => {
        console.log('[WorkoutPage] Load result:', record);
        if (record) {
          const loadedSession = fromSessionRecord(record);
          setSession(loadedSession);
          setShare(record.shared);
          setSaved(true);
        } else {
          // Create new empty session
          const newSession: WorkoutSession = {
            id: sessionId,
            date: selectedDay,
            startTime: `${selectedDay}T00:00:00.000Z`,
            endTime: `${selectedDay}T00:00:00.000Z`,
            exerciseBlocks: [],
            schemaVersion: 1,
          };
          setSession(newSession);
          setShare(false);
          setSaved(false);
        }
      })
      .catch((err) => {
        console.log('[WorkoutPage] Load error:', err);
        const newSession: WorkoutSession = {
          id: sessionId,
          date: selectedDay,
          startTime: `${selectedDay}T00:00:00.000Z`,
          endTime: `${selectedDay}T00:00:00.000Z`,
          exerciseBlocks: [],
          schemaVersion: 1,
        };
        setSession(newSession);
        setShare(false);
        setSaved(false);
      });
  // Plan contents can change when user adds an exercise. Do not reload and
  // overwrite an in-progress session unless selected plan or date changed.
  }, [plan?.id, selectedDay]);

  const addExercise = async () => {
    if (!plan || !exerciseName.trim()) return;
    const nextPlans = plans.map((item) => item.id === plan.id ? { ...item, exercises: [...item.exercises, { name: exerciseName.trim(), targetSets: 3, targetReps: 10, targetWeight: 0 }] } : item);
    try {
      // Persist first. Do not claim exercise was added if Pod write fails.
      const result = await (await container.getWorkoutRepository()).save(nextPlans, templates);
      if (!result.ok) {
        window.alert(`Gagal menyimpan workout option: ${result.error.message}`);
        return;
      }
      setPlans(nextPlans);
    } catch (error) {
      console.error('[WorkoutPage] Add exercise error:', error);
      window.alert('Gagal menyimpan workout option ke Pod.');
      return;
    }
    setExerciseName('');
    setShowAddExercise(false);
  };

  const totalVolume = useMemo(() => session ? calculateVolume(session) : 0, [session]);

  const updateSet = (exerciseName: string, setIndex: number, field: 'reps' | 'weightKg', value: string) => {
    if (!session) return;
    setSaved(false); // Mark as unsaved when data changes
    setSession((current) => {
      if (!current) return current;
      const nextBlocks = [...current.exerciseBlocks];
      const blockIndex = nextBlocks.findIndex((b) => b.exerciseName === exerciseName);
      if (blockIndex === -1) return current;
      
      const block = nextBlocks[blockIndex];
      if (!block) return current;
      const sets = [...block.sets];
      const set = sets[setIndex];
      if (!set) return current;
      
      const updatedSet: SetLog = {
        setIndex: set.setIndex,
        reps: field === 'reps' ? (Number(value) || 0) : set.reps,
        weightKg: field === 'weightKg' ? (Number(value) || 0) : set.weightKg,
        restSec: set.restSec,
        rpe: set.rpe,
      };
      sets[setIndex] = updatedSet;
      
      const updatedBlock: ExerciseBlock = {
        position: block.position,
        exerciseName: block.exerciseName,
        exerciseRef: block.exerciseRef,
        sets,
      };
      nextBlocks[blockIndex] = updatedBlock;
      
      return { ...current, exerciseBlocks: nextBlocks };
    });
  };

  const addSet = (exercise: Exercise) => {
    if (!session) return;
    setSaved(false); // Mark as unsaved when data changes
    setSession((current) => {
      if (!current) return current;
      const nextBlocks = [...current.exerciseBlocks];
      let blockIndex = nextBlocks.findIndex((b) => b.exerciseName === exercise.name);
      
      if (blockIndex === -1) {
        // Create new block
        const newBlock: ExerciseBlock = {
          position: nextBlocks.length + 1,
          exerciseName: exercise.name,
          exerciseRef: { source: 'custom', id: exercise.name.toLowerCase().replace(/\s+/g, '-') },
          sets: [],
        };
        nextBlocks.push(newBlock);
        blockIndex = nextBlocks.length - 1;
      }
      
      const block = nextBlocks[blockIndex];
      if (!block) return current;
      
      const newSet: SetLog = {
        setIndex: block.sets.length + 1,
        weightKg: exercise.targetWeight,
        reps: exercise.targetReps,
      };
      
      const updatedBlock: ExerciseBlock = {
        position: block.position,
        exerciseName: block.exerciseName,
        exerciseRef: block.exerciseRef,
        sets: [...block.sets, newSet],
      };
      nextBlocks[blockIndex] = updatedBlock;
      
      return { ...current, exerciseBlocks: nextBlocks };
    });
  };

  const removeSet = (exerciseName: string, setIndex: number) => {
    if (!session) return;
    setSaved(false); // Mark as unsaved when data changes
    setSession((current) => {
      if (!current) return current;
      const nextBlocks = [...current.exerciseBlocks];
      const blockIndex = nextBlocks.findIndex((b) => b.exerciseName === exerciseName);
      if (blockIndex === -1) return current;
      
      const block = nextBlocks[blockIndex];
      if (!block) return current;
      
      const updatedSets = block.sets.filter((_, i) => i !== setIndex).map((set, i) => ({ ...set, setIndex: i + 1 }));
      
      if (updatedSets.length === 0) {
        // Remove empty block
        nextBlocks.splice(blockIndex, 1);
      } else {
        const updatedBlock: ExerciseBlock = {
          position: block.position,
          exerciseName: block.exerciseName,
          exerciseRef: block.exerciseRef,
          sets: updatedSets,
        };
        nextBlocks[blockIndex] = updatedBlock;
      }
      
      return { ...current, exerciseBlocks: nextBlocks };
    });
  };

  const getBlockForExercise = (exerciseName: string): ExerciseBlock | undefined => {
    return session?.exerciseBlocks.find((b) => b.exerciseName === exerciseName);
  };

  const createPlan = () => {
    if (!planName.trim()) return;
    const source = createMode === 'template' ? templates.find((item) => item.id === templateId) : undefined;
    // Use stable ID - reuse existing or generate new
    const planId = plans.find(p => p.name === planName.trim())?.id || Date.now();
    const newPlan: Plan = { id: planId, name: planName.trim(), days: 'Belum dijadwalkan', exercises: source ? source.exercises.map((exercise) => ({ ...exercise })) : (exerciseName.trim() ? [{ name: exerciseName.trim(), targetSets: 3, targetReps: 10, targetWeight: 0 }] : []) };
    const nextPlans = [...plans, newPlan]; setPlans(nextPlans); setSelectedPlanId(newPlan.id); setPlanName(''); setExerciseName(''); setTemplateId(''); setCreateMode('new'); setShowCreate(false); void persist(nextPlans, templates);
  };

  const deletePlan = async (planId: number) => {
    if (!window.confirm('Hapus workout plan ini? Data tidak dapat dikembalikan.')) return;
    const nextPlans = plans.filter(p => p.id !== planId);
    setPlans(nextPlans);
    if (selectedPlanId === planId) {
      setSelectedPlanId(nextPlans[0]?.id ?? null);
    }
    await persist(nextPlans, templates);
  };

  const deleteSession = async () => {
    if (!plan || !session) return;
    if (!window.confirm('Hapus riwayat sesi ini? Data tidak dapat dikembalikan.')) return;
    
    try {
      const sessionId = `${selectedDay}-${plan.id}`;
      console.log('[WorkoutPage] Deleting session:', sessionId);
      
      // Delete from Pod
      const repo = await container.getWorkoutRepository();
      const result = await repo.deleteSession(sessionId);
      
      console.log('[WorkoutPage] Delete result:', result);
      
      if (!result.ok) {
        window.alert(`Gagal menghapus riwayat sesi: ${result.error.message}`);
        return;
      }
      
      // Reset local state
      const newSession: WorkoutSession = {
        id: sessionId,
        date: selectedDay,
        startTime: `${selectedDay}T00:00:00.000Z`,
        endTime: `${selectedDay}T00:00:00.000Z`,
        exerciseBlocks: [],
        schemaVersion: 1,
      };
      setSession(newSession);
      setSaved(false);
      setShare(false);
      window.alert('Riwayat sesi berhasil dihapus.');
    } catch (error) {
      console.error('[WorkoutPage] Delete error:', error);
      window.alert('Gagal menghapus riwayat sesi.');
    }
  };

  const saveCurrentAsTemplate = () => {
    if (!plan) return;
    const baseName = `${plan.name} template`;
    const existing = templates.filter((item) => item.name === baseName || item.name.startsWith(`${baseName} (`));
    if (existing.length > 0 && !window.confirm(`Template "${baseName}" sudah tersimpan. Simpan lagi?`)) return;
    const nextName = existing.length === 0 ? baseName : `${baseName} (${existing.length})`;
    const nextTemplates = [...templates, { ...plan, id: Date.now(), name: nextName }];
    setTemplates(nextTemplates); void persist(plans, nextTemplates);
    window.alert(`Template "${nextName}" tersimpan.`);
  };

  return <AppShell><PageWrapper title="Latihan" subtitle="Rencanakan latihan, catat progres, dan bagikan sesi Anda." actions={<Button onClick={() => setShowCreate(true)}>+ Buat plan</Button>}>
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, .8fr) minmax(0, 1.8fr)', gap: 20, alignItems: 'start' }}>
      <Card padding={false}><div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}><div style={{ fontWeight: 700 }}>Workout plan</div><div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 3 }}>{plans.length} plan tersimpan</div></div>
        {plans.map((item) => <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--border)' }}><button onClick={() => { setSelectedPlanId(item.id); }} style={{ flex: 1, textAlign: 'left', padding: '16px 20px', background: item.id === selectedPlanId ? 'var(--surface2)' : 'transparent', border: 0, color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}><strong>{item.name}</strong><div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 5 }}>{item.days}</div><div style={{ color: 'var(--secondary)', fontSize: 12, marginTop: 8 }}>{item.exercises.length} latihan</div></button><button onClick={() => deletePlan(item.id)} style={{ padding: '8px 12px', background: 'none', border: 0, color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }} title="Hapus plan">×</button></div>)}
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {!plan && <Card><div style={{ textAlign: 'center', padding: 28 }}><div style={{ fontSize: 18, fontWeight: 700 }}>Belum ada workout plan</div><div style={{ color: 'var(--muted)', fontSize: 13, margin: '8px 0 18px' }}>Buat plan pertama untuk mulai menyusun latihan Anda.</div><Button onClick={() => setShowCreate(true)}>+ Buat plan pertama</Button></div></Card>}
        {plan && session && <>
        <Card><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><strong>Pilih hari latihan</strong><div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 3 }}>Catatan sesi disimpan untuk tanggal ini.</div></div><Input aria-label="Tanggal sesi" type="date" value={selectedDay} onChange={(e) => { setSelectedDay(e.target.value); }} style={{ width: 170 }} /></div></Card>
        <Card><div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><div><div style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>{today}</div><h2 style={{ margin: '5px 0 4px', fontSize: 22 }}>{plan.name}</h2><div style={{ color: 'var(--muted)', fontSize: 13 }}>{plan.exercises.length} latihan • Volume tercatat {totalVolume.toLocaleString('id-ID')} kg</div></div><span style={{ alignSelf: 'start', background: saved ? 'var(--success-bg, #d4edda)' : 'var(--surface2)', color: saved ? 'var(--success, #155724)' : 'var(--secondary)', padding: '7px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600 }}>{saved ? 'SESI SELESAI' : 'SESI AKTIF'}</span></div></Card>
        {plan.exercises.length === 0 && <Card><div style={{ color: 'var(--muted)', textAlign: 'center', padding: 18 }}>Belum ada latihan di plan ini.</div></Card>}
        {plan.exercises.map((exercise) => { 
          const block = getBlockForExercise(exercise.name); 
          const sets = block?.sets ?? []; 
          return <Card key={exercise.name}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}><div><h3 style={{ margin: 0, fontSize: 16 }}>{exercise.name}</h3><div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Target {exercise.targetSets} set × {exercise.targetReps} repetisi{exercise.targetWeight ? ` • ${exercise.targetWeight} kg` : ''}</div></div><Button size="sm" variant="secondary" onClick={() => addSet(exercise)}>+ Tambah set</Button></div>
          {sets.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 28px', gap: 8, alignItems: 'center' }}><div style={{ color: 'var(--muted)', fontSize: 11 }}>SET</div><div style={{ color: 'var(--muted)', fontSize: 11 }}>REPETISI</div><div style={{ color: 'var(--muted)', fontSize: 11 }}>BEBAN (KG)</div><span />{sets.map((set, index) => <React.Fragment key={`${exercise.name}-set-${index}`}><div style={{ color: 'var(--muted)', fontSize: 13 }}>{set.setIndex}</div><Input aria-label={`Repetisi set ${set.setIndex}`} value={String(set.reps)} onChange={(e) => updateSet(exercise.name, index, 'reps', e.target.value)} type="number" min="0"/><Input aria-label={`Beban set ${set.setIndex}`} value={String(set.weightKg)} onChange={(e) => updateSet(exercise.name, index, 'weightKg', e.target.value)} type="number" min="0"/><button aria-label="Hapus set" onClick={() => removeSet(exercise.name, index)} style={{ border: 0, background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>×</button></React.Fragment>)}</div>}
        </Card>; })}
        <Card><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><div><strong>{saved ? 'Sesi selesai' : 'Simpan sesi workout'}</strong><div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>{saved ? `Tersimpan di Pod untuk ${selectedDay}.` : 'Pilih apakah ringkasan sesi ini tampil di feed teman.'}</div></div>{!saved && <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} /> Bagikan ke teman</label>}</div><div style={{ display: 'flex', gap: 8, marginTop: 18 }}>{saved && session && session.exerciseBlocks.length > 0 && <Button variant="ghost" fullWidth onClick={deleteSession}>Hapus riwayat</Button>}<Button fullWidth disabled={saving || saved} onClick={saveSession}>{saved ? 'Sesi selesai' : saving ? 'Menyimpan ke Pod...' : 'Selesaikan sesi'}</Button></div></Card></>}
      </div>
    </div>
        {plan && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}><Button variant="ghost" onClick={saveCurrentAsTemplate}>Simpan sebagai template</Button><Button variant="secondary" onClick={() => setShowAddExercise(true)}>+ Tambah workout option</Button></div>}
    {(showCreate || showAddExercise) && <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 5 }} onClick={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); setShowAddExercise(false); } }}><Card style={{ width: 'min(100%, 460px)' }}><h2 style={{ margin: '0 0 5px', fontSize: 20 }}>{showCreate ? 'Tambah workout plan' : 'Tambah workout option'}</h2><p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 20px' }}>{showCreate ? 'Pakai template tersimpan atau mulai dari plan baru.' : `Tambahkan latihan ke ${plan?.name}.`}</p><div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>{showCreate && <><div style={{ display: 'flex', gap: 8 }}><Button variant={createMode === 'new' ? 'primary' : 'secondary'} onClick={() => setCreateMode('new')}>Create new</Button><Button variant={createMode === 'template' ? 'primary' : 'secondary'} onClick={() => setCreateMode('template')} disabled={!templates.length}>Pakai template</Button></div>{createMode === 'template' && <Select label="Pilih template" value={templateId} onChange={(e) => setTemplateId(Number(e.target.value))}><option value="">Pilih template</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>}<Input label="Nama plan" placeholder="Contoh: Full Body" value={planName} onChange={(e) => setPlanName(e.target.value)} autoFocus/></>}{!showCreate && <Input label="Nama workout" placeholder="Contoh: Squat" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} autoFocus/>}<div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}><Button variant="ghost" onClick={() => { setShowCreate(false); setShowAddExercise(false); }}>Batal</Button><Button onClick={showCreate ? createPlan : addExercise} disabled={showCreate ? (!planName.trim() || (createMode === 'template' && !templateId)) : !exerciseName.trim()}>{showCreate ? 'Tambah plan' : 'Tambah workout'}</Button></div></div></Card></div>}
  </PageWrapper></AppShell>;
};
