'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import AdminLogin from '@/components/admin-login';

type Visit = {
  id: string;
  visited_at: string;
  ph: number;
  chlorine: number;
  notes: string | null;
  status: 'normal' | 'check' | 'needs_attention';
  visit_chemicals: { chemical: string; amount: number; unit: string }[];
  visit_photos: { id: string; photo_type: string; storage_path: string }[];
};
type EditDraft = { id: string; ph: string; chlorine: string; notes: string; status: Visit['status'] };

const statusLabel = (status: string) => status === 'needs_attention' ? 'Needs Attention' : status === 'check' ? 'Check' : 'Normal';
const statusClass = (status: string) => status === 'normal' ? 'bg-[#e3f7eb] text-[#167b43]' : status === 'check' ? 'bg-[#fff4d6] text-[#9b6a00]' : 'bg-[#ffe5e5] text-[#b52d2d]';

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [draft, setDraft] = useState<EditDraft | null>(null);

  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setUser(data.user)); }, [supabase]);

  const loadVisits = useCallback(async () => {
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase.from('visits')
      .select('id,visited_at,ph,chlorine,notes,status,visit_chemicals(chemical,amount,unit),visit_photos(id,photo_type,storage_path)')
      .order('visited_at', { ascending: false }).limit(200);
    if (queryError) { setError(queryError.message); setLoading(false); return; }
    const nextVisits = (data as Visit[]) || [];
    setVisits(nextVisits);
    const paths = nextVisits.flatMap(visit => visit.visit_photos.map(photo => photo.storage_path));
    if (paths.length) {
      const { data: signed, error: signedError } = await supabase.storage.from('pool-photos').createSignedUrls(paths, 3600);
      if (signedError) setError(`Visits loaded, but photos could not be loaded: ${signedError.message}`);
      else setPhotoUrls(Object.fromEntries((signed || []).flatMap((item, index) => item.signedUrl ? [[paths[index], item.signedUrl]] : [])));
    } else setPhotoUrls({});
    setLoading(false);
  }, [supabase]);

  useEffect(() => { if (user?.app_metadata?.role === 'admin') void loadVisits(); }, [user, loadVisits]);

  const startEdit = (visit: Visit) => {
    setActionError('');
    setDraft({ id: visit.id, ph: String(visit.ph), chlorine: String(visit.chlorine), notes: visit.notes || '', status: visit.status });
  };

  const saveEdit = async () => {
    if (!draft) return;
    const ph = Number(draft.ph), chlorine = Number(draft.chlorine);
    if (!Number.isFinite(ph) || ph < 0 || ph > 14 || !Number.isFinite(chlorine) || chlorine < 0) { setActionError('Enter a pH between 0 and 14 and chlorine of 0 or more.'); return; }
    setSavingId(draft.id); setActionError('');
    const { error: updateError } = await supabase.from('visits').update({ ph, chlorine, notes: draft.notes.trim() || null, status: draft.status }).eq('id', draft.id);
    if (updateError) setActionError(updateError.message);
    else { setDraft(null); await loadVisits(); }
    setSavingId('');
  };

  const deleteVisit = async (visit: Visit) => {
    if (!window.confirm('Delete this visit and its photos? This cannot be undone.')) return;
    setDeletingId(visit.id); setActionError('');
    try {
      const paths = visit.visit_photos.map(photo => photo.storage_path);
      if (paths.length) {
        const { error: photoError } = await supabase.storage.from('pool-photos').remove(paths);
        if (photoError) throw photoError;
      }
      const { error: deleteError } = await supabase.from('visits').delete().eq('id', visit.id);
      if (deleteError) throw deleteError;
      if (draft?.id === visit.id) setDraft(null);
      await loadVisits();
    } catch (deleteError) { setActionError(deleteError instanceof Error ? deleteError.message : 'Could not delete this visit.'); }
    setDeletingId('');
  };

  if (user === undefined) return <div className="min-h-screen bg-page" />;
  if (!user) return <AdminLogin />;
  if (user.app_metadata?.role !== 'admin') return <main className="flex min-h-screen items-center justify-center bg-[#f7fafc] px-5 text-center"><div><h1 className="text-2xl font-bold">Admin access required</h1><p className="mt-2 text-[#5d7390]">Your account is not configured as an owner.</p><button onClick={() => void supabase.auth.signOut()} className="mt-5 font-bold text-blue">Sign out</button></div></main>;

  const now = new Date();
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startDay); startWeek.setDate(startDay.getDate() - 6);
  const today = visits.filter(visit => new Date(visit.visited_at) >= startDay);
  const week = visits.filter(visit => new Date(visit.visited_at) >= startWeek);
  const needs = visits.filter(visit => visit.status !== 'normal');
  const chemicalCount = visits.reduce((sum, visit) => sum + visit.visit_chemicals.length, 0);
  const filtered = visits.filter(visit => (filter === 'all' || visit.status === filter) && (!query || [visit.notes, visit.id, ...visit.visit_chemicals.map(item => item.chemical)].join(' ').toLowerCase().includes(query.toLowerCase())));

  return <main className="min-h-screen bg-[#f7fafc] text-ink">
    <header className="bg-navy text-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5"><div className="flex items-center gap-3"><div className="text-2xl text-[#49b3ef]">≈</div><span className="font-bold">Pool Service</span></div><button onClick={() => void supabase.auth.signOut()} className="text-sm text-[#c9dfef]">Sign out</button></div></header>
    <div className="mx-auto max-w-6xl px-5 py-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-blue">Owner review</p><h1 className="mt-1 text-3xl font-bold">Pool Health Overview</h1></div><div className="text-sm text-[#5d7390]">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(now)}</div></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Visits today', today.length], ['This week', week.length], ['Needs review', needs.length], ['Chemical additions', chemicalCount]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[#d3e0eb] bg-white p-5 shadow-[0_2px_7px_rgba(30,75,105,.03)]"><p className="text-sm text-[#5d7390]">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div>
      <div className="mt-8 rounded-2xl border border-[#d3e0eb] bg-white p-5"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-xl font-bold">Newest visits</h2><div className="flex flex-col gap-2 sm:flex-row"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search visits" className="focus-ring min-h-11 rounded-lg border border-[#c5d5e3] px-3 text-sm" /><select value={filter} onChange={event => setFilter(event.target.value)} className="focus-ring min-h-11 rounded-lg border border-[#c5d5e3] bg-white px-3 text-sm"><option value="all">All statuses</option><option value="normal">Normal</option><option value="check">Check</option><option value="needs_attention">Needs Attention</option></select></div></div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{actionError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{actionError}</p>}
        {loading ? <p className="py-10 text-center text-[#5d7390]">Loading visits…</p> : filtered.length === 0 ? <p className="py-10 text-center text-[#5d7390]">No visits match this view.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="border-b border-[#d3e0eb] text-xs uppercase tracking-wide text-[#5d7390]"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">pH</th><th className="px-3 py-3">Chlorine</th><th className="px-3 py-3">Chemicals</th><th className="px-3 py-3">Photos</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th></tr></thead><tbody>{filtered.map(visit => <Fragment key={visit.id}><tr className="border-b border-[#edf2f6] last:border-0"><td className="px-3 py-4"><Link href={`/admin/visits/${visit.id}`} className="font-bold text-blue hover:underline">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(visit.visited_at))}</Link></td><td className="px-3 py-4 font-bold">{visit.ph}</td><td className="px-3 py-4">{visit.chlorine} ppm</td><td className="max-w-[240px] px-3 py-4">{visit.visit_chemicals.map(item => `${item.chemical} (${item.amount} ${item.unit})`).join(', ') || '—'}</td><td className="px-3 py-4"><div className="flex items-center gap-1.5">{visit.visit_photos.slice(0, 3).map(photo => photoUrls[photo.storage_path] ? <img key={photo.id} src={photoUrls[photo.storage_path]} alt={`${photo.photo_type} visit photo`} className="h-12 w-12 rounded-lg object-cover" /> : <span key={photo.id} className="h-12 w-12 rounded-lg bg-[#edf2f6]" />)}{visit.visit_photos.length > 3 && <span className="text-xs font-bold text-[#5d7390]">+{visit.visit_photos.length - 3}</span>}{visit.visit_photos.length === 0 && <span className="text-[#5d7390]">—</span>}</div></td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(visit.status)}`}>{statusLabel(visit.status)}</span></td><td className="px-3 py-4"><div className="flex gap-2"><button type="button" onClick={() => startEdit(visit)} className="focus-ring rounded-lg border border-[#b9ccdc] px-3 py-2 text-xs font-bold text-blue">Edit</button><button type="button" disabled={deletingId === visit.id} onClick={() => void deleteVisit(visit)} className="focus-ring rounded-lg border border-[#f0b5b5] px-3 py-2 text-xs font-bold text-[#b52d2d] disabled:opacity-50">{deletingId === visit.id ? 'Deleting…' : 'Delete'}</button></div></td></tr>{draft?.id === visit.id && <tr className="border-b border-[#d3e0eb] bg-[#f8fafc]"><td colSpan={7} className="px-3 py-4"><div className="grid gap-3 md:grid-cols-[110px_140px_1fr_170px_auto] md:items-end"><label className="text-xs font-bold text-[#4e6179]">pH<input value={draft.ph} onChange={event => setDraft({ ...draft, ph: event.target.value })} type="number" min="0" max="14" step="0.1" className="focus-ring mt-1 min-h-10 w-full rounded-lg border border-[#c5d5e3] px-2" /></label><label className="text-xs font-bold text-[#4e6179]">Chlorine<input value={draft.chlorine} onChange={event => setDraft({ ...draft, chlorine: event.target.value })} type="number" min="0" step="0.1" className="focus-ring mt-1 min-h-10 w-full rounded-lg border border-[#c5d5e3] px-2" /></label><label className="text-xs font-bold text-[#4e6179]">Notes<textarea value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} rows={2} className="focus-ring mt-1 w-full rounded-lg border border-[#c5d5e3] px-2 py-2" /></label><label className="text-xs font-bold text-[#4e6179]">Status<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as Visit['status'] })} className="focus-ring mt-1 min-h-10 w-full rounded-lg border border-[#c5d5e3] bg-white px-2"><option value="normal">Normal</option><option value="check">Check</option><option value="needs_attention">Needs Attention</option></select></label><div className="flex gap-2"><button type="button" disabled={savingId === visit.id} onClick={() => void saveEdit()} className="focus-ring min-h-10 rounded-lg bg-blue px-3 text-xs font-bold text-white disabled:opacity-50">{savingId === visit.id ? 'Saving…' : 'Save'}</button><button type="button" onClick={() => setDraft(null)} className="focus-ring min-h-10 rounded-lg border border-[#b9ccdc] px-3 text-xs font-bold">Cancel</button></div></div></td></tr>}</Fragment>)}</tbody></table></div>}
      </div>
    </div>
  </main>;
}
