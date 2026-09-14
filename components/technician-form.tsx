'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/image';
import * as htmlToImage from 'html-to-image';

type ChemicalUnit = 'kg' | 'oz' | 'gal' | 'lbs' | 'other';

const today = new Intl.DateTimeFormat('en-US', { 
  weekday: 'long', 
  month: 'long', 
  day: 'numeric', 
  year: 'numeric' 
}).format(new Date());

type ChecklistItem = { id: string; label: string };

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { id: 'check_levels', label: 'Check Levels' },
  { id: 'skim', label: 'Skim' },
  { id: 'vacuum', label: 'Vacuum' },
  { id: 'brush', label: 'Brush' },
  { id: 'empty_basket', label: 'Empty Basket' },
  { id: 'backwash_filter', label: 'Backwash Filter' },
];

const COOL_PALETTE_CLEANING: Record<string, { bg: string; border: string; text: string; dot: string; hoverBg: string }> = {
  check_levels: {
    bg: 'bg-[#f0f9ff]', // Light sky blue
    border: 'border-[#bae6fd]',
    text: 'text-[#0369a1]',
    dot: 'bg-[#0284c7]',
    hoverBg: 'hover:bg-[#e0f2fe]',
  },
  skim: {
    bg: 'bg-[#ecfdf5]', // Light mint green/teal
    border: 'border-[#a7f3d0]',
    text: 'text-[#047857]',
    dot: 'bg-[#059669]',
    hoverBg: 'hover:bg-[#d1fae5]',
  },
  vacuum: {
    bg: 'bg-[#f5f3ff]', // Light lavender/violet
    border: 'border-[#ddd6fe]',
    text: 'text-[#6d28d9]',
    dot: 'bg-[#7c3aed]',
    hoverBg: 'hover:bg-[#ede9fe]',
  },
  brush: {
    bg: 'bg-[#f0fdfa]', // Light teal/cyan
    border: 'border-[#99f6e4]',
    text: 'text-[#0f766e]',
    dot: 'bg-[#0d9488]',
    hoverBg: 'hover:bg-[#ccfbf1]',
  },
  empty_basket: {
    bg: 'bg-[#eef2ff]', // Light indigo
    border: 'border-[#c7d2fe]',
    text: 'text-[#4338ca]',
    dot: 'bg-[#4f46e5]',
    hoverBg: 'hover:bg-[#e0e7ff]',
  },
  backwash_filter: {
    bg: 'bg-[#fdf2f8]', // Light pink/magenta
    border: 'border-[#fbcfe8]',
    text: 'text-[#be185d]',
    dot: 'bg-[#db2777]',
    hoverBg: 'hover:bg-[#fce7f3]',
  },
};

const COOL_PALETTE_CHEMICALS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  tablets: {
    bg: 'bg-[#f0f9ff]',
    border: 'border-[#bae6fd]',
    text: 'text-[#0369a1]',
    dot: 'bg-[#0284c7]',
  },
  hcl: {
    bg: 'bg-[#ecfdf5]',
    border: 'border-[#a7f3d0]',
    text: 'text-[#047857]',
    dot: 'bg-[#059669]',
  },
  granules: {
    bg: 'bg-[#f5f3ff]',
    border: 'border-[#ddd6fe]',
    text: 'text-[#6d28d9]',
    dot: 'bg-[#7c3aed]',
  },
  soda_ash: {
    bg: 'bg-[#f0fdfa]',
    border: 'border-[#99f6e4]',
    text: 'text-[#0f766e]',
    dot: 'bg-[#0d9488]',
  },
  other: {
    bg: 'bg-[#eef2ff]',
    border: 'border-[#c7d2fe]',
    text: 'text-[#4338ca]',
    dot: 'bg-[#4f46e5]',
  },
  no_chemicals: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
};

function Section({ number, title, detail, children }: { number: string; title: string; detail?: string; children: React.ReactNode }) { 
  return (
    <section className="rounded-3xl border border-[#e2eaf1] bg-white p-6 shadow-[0_4px_12px_rgba(30,75,105,.02)] hover:shadow-[0_6px_18px_rgba(30,75,105,.04)] transition-shadow duration-300">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold text-[#0f2942] flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue/10 text-xs font-black text-blue">{number}</span>
          {title}
        </h2>
        {detail && <span className="text-xs font-bold text-[#5d7390] uppercase tracking-wider">{detail}</span>}
      </div>
      {children}
    </section>
  ); 
}

function PhotoTile({ file, onRemove }: { file: File; onRemove: () => void }) { 
  const url = useMemo(() => URL.createObjectURL(file), [file]); 
  return (
    <div className="relative h-28 w-28 overflow-hidden rounded-2xl border border-[#b9ccdc] shadow-sm">
      {file.type.startsWith('video/') ? (
        <video src={url} aria-label="Selected pool service video" className="h-full w-full object-cover" muted playsInline />
      ) : (
        <img src={url} alt="Selected pool service photo" className="h-full w-full object-cover" />
      )}
      <button 
        type="button" 
        onClick={onRemove} 
        aria-label="Remove photo or video" 
        className="focus-ring absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-[#17233b]/80 backdrop-blur-sm text-sm text-white font-bold hover:bg-[#17233b] transition-colors"
      >
        ×
      </button>
    </div>
  ); 
}

export default function TechnicianForm() {
  const supabase = useMemo(() => createClient(), []); 
  const stripRef = useRef<HTMLInputElement>(null); 
  const generalRef = useRef<HTMLInputElement>(null);
  
  const poolName = "Villa Sayang - Yeh Gangga";

  const [ph, setPh] = useState(''); 
  const [chlorine, setChlorine] = useState(''); 
  const [strip, setStrip] = useState<File | null>(null); 
  const [photos, setPhotos] = useState<File[]>([]); 
  const [notes, setNotes] = useState(''); 

  const [stripDataUrl, setStripDataUrl] = useState<string | null>(null);
  const [photoDataUrls, setPhotoDataUrls] = useState<string[]>([]);
  const [noChemicals, setNoChemicals] = useState(false);

  useEffect(() => {
    if (!strip) {
      setStripDataUrl(null);
      return;
    }
    let active = true;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (active && typeof reader.result === 'string') {
        setStripDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(strip);
    return () => {
      active = false;
    };
  }, [strip]);

  useEffect(() => {
    if (photos.length === 0) {
      setPhotoDataUrls([]);
      return;
    }
    let active = true;
    const loadUrls = async () => {
      const urls = await Promise.all(
        photos.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(typeof reader.result === 'string' ? reader.result : '');
            };
            reader.readAsDataURL(file);
          });
        })
      );
      if (active) {
        setPhotoDataUrls(urls);
      }
    };
    loadUrls();
    return () => {
      active = false;
    };
  }, [photos]); 
  const [errors, setErrors] = useState<Record<string, string>>({}); 
  const [saving, setSaving] = useState(false); 
  const [saved, setSaved] = useState(false);
  const [savedVisitId, setSavedVisitId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  // Pool Cleaning Checklist State
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    check_levels: false,
    skim: false,
    vacuum: false,
    brush: false,
    empty_basket: false,
    backwash_filter: false,
  });

  // Chemicals Added Checkbox List State (from hand-drawn sketch)
  const [chemChecklist, setChemChecklist] = useState({
    tablets: { checked: false, amount: '1', label: 'Chlorine (Tablets)', unit: 'other' as const },
    hcl: { checked: false, amount: '1', label: 'HCL (Liters)', unit: 'other' as const },
    granules: { checked: false, amount: '', label: 'Chlorine (Granules)', unit: 'kg' as const },
    soda_ash: { checked: false, amount: '', label: 'Soda Ash', unit: 'kg' as const },
    other: { checked: false, amount: '', name: '', label: 'Other', unit: 'other' as const },
  });

  const toggleChecklistItem = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const reset = () => {
    setPh('');
    setChlorine('');
    setStrip(null);
    setPhotos([]);
    setNotes('');
    setErrors({});
    setSaved(false);
    setSavedVisitId(null);
    setSharing(false);
    setCheckedItems({
      check_levels: false,
      skim: false,
      vacuum: false,
      brush: false,
      empty_basket: false,
      backwash_filter: false,
    });
    setChemChecklist({
      tablets: { checked: false, amount: '1', label: 'Chlorine (Tablets)', unit: 'other' as const },
      hcl: { checked: false, amount: '1', label: 'HCL (Liters)', unit: 'other' as const },
      granules: { checked: false, amount: '', label: 'Chlorine (Granules)', unit: 'kg' as const },
      soda_ash: { checked: false, amount: '', label: 'Soda Ash', unit: 'kg' as const },
      other: { checked: false, amount: '', name: '', label: 'Other', unit: 'other' as const },
    });
  };

  const handleSharePng = async () => {
    const cardElement = document.getElementById('export-report-card');
    if (!cardElement) return;

    setSharing(true);
    try {
      const options = {
        backgroundColor: '#ffffff',
        style: {
          borderRadius: '0',
          padding: '24px',
        },
        pixelRatio: 2, // Retina resolution!
        cacheBust: true,
      };

      // Generate high-resolution PNG of the card.
      // Safari/iOS workaround: call toPng twice to warm up cache and prevent blank images or rendering failures.
      await htmlToImage.toPng(cardElement, options);
      const dataUrl = await htmlToImage.toPng(cardElement, options);

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `pool-report-${savedVisitId?.slice(0, 8) || 'visit'}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Pool Report - ${poolName}`,
          text: `Service report for ${poolName} on ${today}`,
        });
      } else {
        // Fallback: Copy to clipboard as image if possible, or just download the file
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              [blob.type]: blob,
            })
          ]);
          alert('Success! PNG report image copied to clipboard. You can paste it directly into WhatsApp.');
        } catch (clipErr) {
          // Fallback download if clipboard sharing fails
          const link = document.createElement('a');
          link.download = `pool-report-villa-sayang-${savedVisitId?.slice(0, 8) || 'visit'}.png`;
          link.href = dataUrl;
          link.click();
        }
      }
    } catch (err) {
      console.error('Error sharing PNG report:', err);
      alert('Failed to generate image for sharing. You can still use the download/start options.');
    } finally {
      setSharing(false);
    }
  };

  const validate = () => { 
    const next: Record<string, string> = {}; 
    
    if (ph.trim() !== '') {
      const p = Number(ph);
      if (!Number.isFinite(p) || p < 0 || p > 14) {
        next.ph = 'Enter a pH between 0 and 14.'; 
      }
    }
    if (chlorine.trim() !== '') {
      const c = Number(chlorine);
      if (!Number.isFinite(c) || c < 0) {
        next.chlorine = 'Enter a chlorine value of 0 or more.'; 
      }
    }
    
    // Chemicals validation (Only validate checked items)
    if (chemChecklist.tablets.checked) {
      const val = Number(chemChecklist.tablets.amount);
      if (!chemChecklist.tablets.amount || !Number.isFinite(val) || val <= 0) {
        next.tablets = 'Enter a valid amount of Chlorine tablets.';
      }
    }
    if (chemChecklist.hcl.checked) {
      const val = Number(chemChecklist.hcl.amount);
      if (!chemChecklist.hcl.amount || !Number.isFinite(val) || val <= 0) {
        next.hcl = 'Enter a valid volume of HCL in Liters.';
      }
    }
    if (chemChecklist.granules.checked) {
      const val = Number(chemChecklist.granules.amount);
      if (!chemChecklist.granules.amount || !Number.isFinite(val) || val <= 0) {
        next.granules = 'Enter a valid weight of Chlorine Granules.';
      }
    }
    if (chemChecklist.soda_ash.checked) {
      const val = Number(chemChecklist.soda_ash.amount);
      if (!chemChecklist.soda_ash.amount || !Number.isFinite(val) || val <= 0) {
        next.soda_ash = 'Enter a valid weight of Soda Ash.';
      }
    }
    if (chemChecklist.other.checked) {
      if (!chemChecklist.other.name.trim()) {
        next.other = 'Enter details for the custom chemical.';
      }
    }

    setErrors(next); 
    return Object.keys(next).length === 0; 
  };

  const handleStrip = async (file?: File) => { 
    if (file) setStrip(await compressImage(file)); 
  };

  const handleGeneral = async (files: FileList | null) => { 
    if (!files) return; 
    const media = await Promise.all(Array.from(files).map(file => compressImage(file))); 
    setPhotos(old => [...old, ...media]); 
  };

  const save = async () => { 
    if (!validate()) return; 
    setSaving(true); 
    setErrors({}); 
    let step = 'visit record'; 
    try {
      const phToSave = ph.trim() === '' ? 7.5 : Number(ph);
      const chlorineToSave = chlorine.trim() === '' ? 2.0 : Number(chlorine);
      const status = phToSave < 7.2 || phToSave > 7.8 || chlorineToSave < 1 || chlorineToSave > 3 ? 'check' : 'normal';
      const visitId = crypto.randomUUID(); 
      
      const { error: visitError } = await supabase.from('visits').insert({ 
        id: visitId, 
        ph: phToSave, 
        chlorine: chlorineToSave, 
        notes: notes.trim() || null, 
        status 
      }); 
      
      if (visitError) throw visitError;
      
      const all = [
        ...(strip ? [{ file: strip, type: 'test_strip' as const }] : []),
        ...photos.map(file => ({ file, type: 'other' as const }))
      ]; 
      const metadata: { visit_id: string; photo_type: string; storage_path: string }[] = [];
      
      step = 'photo upload';
      for (const { file, type } of all) { 
        const path = `${visitId}/${type}/${crypto.randomUUID()}.jpg`; 
        const { error } = await supabase.storage.from('pool-photos').upload(path, file, { 
          contentType: file.type || 'image/jpeg', 
          upsert: false 
        }); 
        if (error) throw error; 
        metadata.push({ visit_id: visitId, photo_type: type, storage_path: path }); 
      }
      
      step = 'photo record';
      if (metadata.length) { 
        const { error } = await supabase.from('visit_photos').insert(metadata); 
        if (error) throw error; 
      }
      
      step = 'chemical record';
      
      // Collect valid, checked chemicals from checklist state
      const validChemicals: { visit_id: string; chemical: string; amount: number; unit: ChemicalUnit }[] = [];
      
      if (chemChecklist.tablets.checked && chemChecklist.tablets.amount) {
        validChemicals.push({
          visit_id: visitId,
          chemical: 'Chlorine (Tablets)',
          amount: Number(chemChecklist.tablets.amount),
          unit: 'other'
        });
      }
      if (chemChecklist.hcl.checked && chemChecklist.hcl.amount) {
        validChemicals.push({
          visit_id: visitId,
          chemical: 'HCL (Liters)',
          amount: Number(chemChecklist.hcl.amount),
          unit: 'other'
        });
      }
      if (chemChecklist.granules.checked && chemChecklist.granules.amount) {
        validChemicals.push({
          visit_id: visitId,
          chemical: 'Chlorine (Granules)',
          amount: Number(chemChecklist.granules.amount),
          unit: 'kg'
        });
      }
      if (chemChecklist.soda_ash.checked && chemChecklist.soda_ash.amount) {
        validChemicals.push({
          visit_id: visitId,
          chemical: 'Soda Ash',
          amount: Number(chemChecklist.soda_ash.amount),
          unit: 'kg'
        });
      }
      if (chemChecklist.other.checked && chemChecklist.other.name.trim() && chemChecklist.other.amount) {
        validChemicals.push({
          visit_id: visitId,
          chemical: chemChecklist.other.name.trim(),
          amount: Number(chemChecklist.other.amount),
          unit: chemChecklist.other.unit
        });
      }

      if (validChemicals.length) { 
        const { error } = await supabase.from('visit_chemicals').insert(validChemicals); 
        if (error) throw error; 
      }
      
      setSavedVisitId(visitId);
      setSaved(true);
    } catch (error) { 
      console.error(error); 
      const detail = error instanceof Error ? error.message : (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string' ? error.message : 'Please try again.'); 
      setErrors({ form: `Could not save the ${step}. ${detail}` }); 
    } finally { 
      setSaving(false); 
    }
  };

  if (saved) {
    return (
      <main className="min-h-screen px-4 py-4 sm:py-8 bg-[#f7fafc]">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[620px] flex-col items-center justify-center rounded-3xl bg-white p-8 text-center shadow-soft border border-[#e2eaf1]">
          <div className="mb-6 flex h-18 w-16 items-center justify-center rounded-full bg-[#e3f7eb] text-4xl text-[#1b9453]">✓</div>
          <h1 className="text-3xl font-black text-ink">Visit Saved!</h1>
          <p className="mt-2 text-[#5d7390] font-semibold">Everything has been recorded successfully.</p>
          
          {/* High-Fidelity Report Card for PNG Export */}
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e2eaf1] bg-white text-left shadow-soft mt-6">
            <div id="export-report-card" className="p-6 bg-white">
              <div className="flex items-center justify-between border-b border-[#f2f6fa] pb-4">
                <div>
                  <div className="flex items-center gap-1.5 text-blue">
                    <span className="text-lg font-bold">≈</span>
                    <span className="text-xs font-black uppercase tracking-wider text-[#0d4261]">Pool Service</span>
                  </div>
                  <h2 className="mt-1 text-lg font-black text-ink">{poolName}</h2>
                  <p className="text-[10px] font-bold text-[#5d7390] mt-0.5">{today}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                  (Number(ph) < 7.2 || Number(ph) > 7.8 || Number(chlorine) < 1 || Number(chlorine) > 3) 
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' 
                    : 'bg-[#e3f7eb] text-[#1b9453] border border-[#cbeedd]'
                }`}>
                  {(Number(ph) < 7.2 || Number(ph) > 7.8 || Number(chlorine) < 1 || Number(chlorine) > 3) ? 'CHECK' : 'NORMAL'}
                </span>
              </div>

              {/* Side-by-side pH and Chlorine Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3 border-b border-[#f2f6fa] pb-4">
                <div className="rounded-2xl bg-[#ebf5fe] p-3 text-center border border-[#d0e3fc]">
                  <span className="block text-[10px] font-extrabold text-[#4c7397] uppercase tracking-wider">pH Level</span>
                  <span className="text-2xl font-black text-blue">{ph}</span>
                  <span className="block text-[9px] font-bold text-[#5d7390] mt-0.5">
                    {(Number(ph) < 7.2 || Number(ph) > 7.8) ? '⚠️ Out of Range' : '✨ Ideal Range'}
                  </span>
                </div>
                <div className="rounded-2xl bg-[#e3f7eb] p-3 text-center border border-[#cbeedd]">
                  <span className="block text-[10px] font-extrabold text-[#207a44] uppercase tracking-wider">Chlorine</span>
                  <span className="text-2xl font-black text-[#1b9453]">{chlorine} <span className="text-xs font-bold">ppm</span></span>
                  <span className="block text-[9px] font-bold text-[#207a44]/85 mt-0.5">
                    {(Number(chlorine) < 1.0 || Number(chlorine) > 3.0) ? '⚠️ Out of Range' : '✨ Ideal Range'}
                  </span>
                </div>
              </div>

              {/* Chemicals Section */}
              {(Object.values(chemChecklist).some(c => c.checked) || noChemicals) && (
                <div className="mt-4 border-b border-[#f2f6fa] pb-4">
                  <span className="text-[10px] font-black text-[#5d7390] uppercase tracking-wider block">Chemicals Added</span>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {noChemicals && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        <span className="h-2 w-2 rounded-full bg-slate-400 flex-shrink-0" />
                        No Chemicals Added
                      </span>
                    )}
                    {chemChecklist.tablets.checked && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-50 border border-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700">
                        <span className="h-2 w-2 rounded-full bg-sky-500 flex-shrink-0" />
                        {chemChecklist.tablets.label}: {chemChecklist.tablets.amount} tablet{Number(chemChecklist.tablets.amount) !== 1 ? 's' : ''}
                      </span>
                    )}
                    {chemChecklist.hcl.checked && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
                        {chemChecklist.hcl.label}: {chemChecklist.hcl.amount} L
                      </span>
                    )}
                    {chemChecklist.granules.checked && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 border border-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                        <span className="h-2 w-2 rounded-full bg-violet-500 flex-shrink-0" />
                        {chemChecklist.granules.label}: {chemChecklist.granules.amount} kg
                      </span>
                    )}
                    {chemChecklist.soda_ash.checked && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 border border-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">
                        <span className="h-2 w-2 rounded-full bg-teal-500 flex-shrink-0" />
                        {chemChecklist.soda_ash.label}: {chemChecklist.soda_ash.amount} kg
                      </span>
                    )}
                    {chemChecklist.other.checked && chemChecklist.other.name.trim() && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 border border-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
                        <span className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" />
                        {chemChecklist.other.name.trim()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Cleaning Checklist Section */}
              <div className="mt-4 border-b border-[#f2f6fa] pb-4">
                <span className="text-[10px] font-black text-[#5d7390] uppercase tracking-wider block">Cleaning Checklist</span>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {CHECKLIST_ITEMS.map(item => (
                    <div key={item.id} className="flex items-center gap-1.5 text-xs font-bold text-ink py-0.5">
                      <span className="text-emerald-500 text-[11px]">✓</span>
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Media Section */}
              <div className="mt-4 border-b border-[#f2f6fa] pb-4">
                <span className="text-[10px] font-black text-[#5d7390] uppercase tracking-wider block">Media Logged</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {strip && (
                    <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      <img src={stripDataUrl || URL.createObjectURL(strip)} alt="Test strip" className="h-full w-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-navy/70 text-[7px] text-center font-black text-white py-0.5 uppercase tracking-wide">strip</span>
                    </div>
                  )}
                  {photos.map((file, i) => (
                    <div key={i} className="relative h-14 w-14 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                      {file.type.startsWith('video/') ? (
                        <video src={photoDataUrls[i] || URL.createObjectURL(file)} className="h-full w-full object-cover" muted />
                      ) : (
                        <img src={photoDataUrls[i] || URL.createObjectURL(file)} alt="Pool photo" className="h-full w-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              {notes.trim() && (
                <div className="mt-4">
                  <span className="text-[10px] font-black text-[#5d7390] uppercase tracking-wider block">Technician Notes</span>
                  <p className="mt-1 text-xs font-bold text-ink bg-slate-50 border border-slate-100/50 p-2.5 rounded-xl italic leading-relaxed">
                    "{notes.trim()}"
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
            <button 
              onClick={handleSharePng} 
              disabled={sharing}
              className="focus-ring flex min-h-14 items-center justify-center rounded-2xl bg-[#52b197] hover:bg-[#43a187] px-6 font-extrabold tracking-wide text-white shadow-soft hover:scale-[1.01] active:scale-[0.99] transition-all text-base gap-2 disabled:cursor-wait disabled:opacity-60"
            >
              <span>🖼️</span> {sharing ? 'GENERATING IMAGE…' : 'SHARE THIS VISIT'}
            </button>
            <button 
              onClick={reset} 
              className="focus-ring flex min-h-14 items-center justify-center rounded-2xl border border-[#c5d5e3] px-6 font-extrabold tracking-wide text-[#5d7390] hover:bg-[#f7fafc] transition-all text-base"
            >
              START ANOTHER VISIT
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:py-8 bg-[#f7fafc] pb-12">
      <div className="mx-auto max-w-[620px]">
        {/* Premium Gradient Header with Bottom Wave Curve */}
        <header className="rounded-3xl bg-gradient-to-br from-[#0c243c] via-[#0f3d59] to-[#195a75] px-6 py-8 text-white shadow-soft relative overflow-hidden pb-14">
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue text-xl font-bold shadow-soft">≈</div>
            <span className="text-xl font-extrabold tracking-tight">{poolName}</span>
          </div>
          
          <div className="mt-8">
            <span className="text-xs font-extrabold tracking-wider text-white/60 uppercase">Hello Wayan!</span>
            <p className="text-2xl font-black mt-1 leading-none tracking-tight">{today}</p>
          </div>

          {/* Dynamic Wave Shape Bottom */}
          <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-[0]">
            <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block h-[22px] w-full fill-[#f7fafc]">
              <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="#f7fafc"></path>
            </svg>
          </div>
        </header>

        <form onSubmit={e => { e.preventDefault(); void save(); }} className="mt-6 space-y-5">
          {/* Section 1: Water Test */}
          <Section number="1" title="Water Test">
            <div className="grid grid-cols-2 gap-2.5">
              <label className="rounded-2xl border border-[#c5d5e3] p-4 bg-slate-50/20 block cursor-pointer">
                <span className="block text-xs font-black text-[#5d7390] uppercase tracking-wider">pH</span>
                <input 
                  aria-label="pH" 
                  inputMode="decimal" 
                  type="number" 
                  min="0" 
                  max="14" 
                  step="0.1" 
                  value={ph} 
                  onChange={e => setPh(e.target.value)} 
                  className="focus-ring mt-2 w-full border-0 p-0 text-3xl font-extrabold text-ink bg-transparent outline-none placeholder:text-slate-300" 
                  placeholder="0.0" 
                />
                <span className="mt-2 block text-[11px] font-bold text-[#5d7390]">Ideal 7.2 – 7.8</span>
              </label>
              
              <label className="rounded-2xl border border-[#c5d5e3] p-4 bg-slate-50/20 block cursor-pointer">
                <span className="block text-xs font-black text-[#5d7390] uppercase tracking-wider">Chlorine (ppm)</span>
                <input 
                  aria-label="Chlorine ppm" 
                  inputMode="decimal" 
                  type="number" 
                  min="0" 
                  step="0.1" 
                  value={chlorine} 
                  onChange={e => setChlorine(e.target.value)} 
                  className="focus-ring mt-2 w-full border-0 p-0 text-3xl font-extrabold text-ink bg-transparent outline-none placeholder:text-slate-300" 
                  placeholder="0.0" 
                />
                <span className="mt-2 block text-[11px] font-bold text-[#5d7390]">Ideal 1.0 – 3.0</span>
              </label>
            </div>
            
            {(errors.ph || errors.chlorine) && (
              <p className="mt-3 text-sm font-bold text-red-600">{errors.ph || errors.chlorine}</p>
            )}
            
            <div className="mt-6 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#0f2942]">Test Results Photo</h3>
              <span className="text-[10px] font-extrabold text-[#5d7390] bg-[#edf2f6] px-2 py-0.5 rounded-full uppercase">optional</span>
            </div>
            
            <input 
              ref={stripRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={e => { void handleStrip(e.target.files?.[0]); }} 
            />
            
            {strip ? (
              <div className="relative mt-3 overflow-hidden rounded-2xl border border-[#a6bed0] shadow-sm">
                <img src={URL.createObjectURL(strip)} alt="Water test strip" className="h-48 w-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => setStrip(null)} 
                  className="absolute right-3 top-3 rounded-xl bg-[#17233b]/85 backdrop-blur-sm px-4 py-2 text-xs font-bold text-white hover:bg-[#17233b] transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={() => stripRef.current?.click()} 
                className="focus-ring mt-3 flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#91abc0] bg-[#f8fafc] hover:bg-[#edf3f8] transition-colors text-[#58758b]"
              >
                <span className="text-3xl">📷</span>
                <span className="mt-2 text-xs font-black uppercase tracking-wider">Take or Choose Test Strip Photo</span>
              </button>
            )}
            {errors.strip && <p className="mt-2 text-xs font-bold text-red-600">{errors.strip}</p>}
          </Section>

          {/* Section 2: Pool & Filter Photos */}
          <Section number="2" title="Pool & Filter Photos" detail={`${photos.length} ${photos.length === 1 ? 'item' : 'items'}`}>
            <input 
              ref={generalRef} 
              type="file" 
              accept="image/*,video/*" 
              multiple 
              className="hidden" 
              onChange={e => { void handleGeneral(e.target.files); e.currentTarget.value = ''; }} 
            />
            
            {photos.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-3">
                {photos.map((file, i) => (
                  <PhotoTile 
                    key={`${file.name}-${i}`} 
                    file={file} 
                    onRemove={() => setPhotos(old => old.filter((_, index) => index !== i))} 
                  />
                ))}
              </div>
            )}
            
            <button 
              type="button" 
              onClick={() => generalRef.current?.click()} 
              className="focus-ring flex h-28 w-28 flex-col items-center justify-center rounded-2xl border border-dashed border-[#91abc0] bg-[#f8fafc] hover:bg-[#edf3f8] transition-colors text-[#58758b]"
            >
              <span className="text-3xl">⊙</span>
              <span className="mt-1 text-xs font-black uppercase tracking-wider">Add Media</span>
            </button>
            <p className="mt-3 text-xs text-[#5d7390] font-semibold">Take or choose photos or videos of the pool, filters, or equipment.</p>
          </Section>

          {/* Section 3: Chemicals Added (REVISED TO CHECKLIST FROM SKETCH) */}
          <Section number="3" title="Chemicals Added" detail="optional">
            <p className="text-xs text-[#5d7390] font-semibold mb-4">Check any chemicals you added during this visit and enter the amount.</p>
            <div className="space-y-3">
              
              {/* Chlorine Tablets */}
              <div className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                chemChecklist.tablets.checked 
                  ? 'border-[#52b197] bg-[#ebf7f4] shadow-sm' 
                  : `${COOL_PALETTE_CHEMICALS.tablets.border} ${COOL_PALETTE_CHEMICALS.tablets.bg}`
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setNoChemicals(false);
                    setChemChecklist(prev => ({ ...prev, tablets: { ...prev.tablets, checked: !prev.tablets.checked } }));
                  }}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-150 ${
                    chemChecklist.tablets.checked ? 'bg-[#52b197] border-[#52b197] text-white' : 'border-slate-300 bg-white/70'
                  }`}>
                    {chemChecklist.tablets.checked && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full flex-shrink-0 ${chemChecklist.tablets.checked ? 'bg-[#52b197]' : COOL_PALETTE_CHEMICALS.tablets.dot}`} />
                    <span className={`font-extrabold text-sm ${chemChecklist.tablets.checked ? 'text-[#1d5244]' : COOL_PALETTE_CHEMICALS.tablets.text}`}>
                      Chlorine (Tablets)
                    </span>
                  </div>
                </button>
                
                {/* Tactile Counter */}
                <div className={`flex items-center gap-1.5 transition-all duration-200 ${
                  chemChecklist.tablets.checked ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}>
                  <button
                    type="button"
                    onClick={() => setChemChecklist(prev => ({
                      ...prev,
                      tablets: { ...prev.tablets, amount: Math.max(0, Number(prev.tablets.amount || 0) - 1).toString() }
                    }))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-extrabold text-lg select-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    aria-label="Chlorine Tablets amount"
                    value={chemChecklist.tablets.amount}
                    onChange={e => setChemChecklist(prev => ({
                      ...prev,
                      tablets: { ...prev.tablets, amount: e.target.value }
                    }))}
                    className="w-12 text-center font-extrabold text-sm text-[#0f2942] focus-ring border border-slate-200 rounded-xl py-1.5 bg-white/80"
                  />
                  <button
                    type="button"
                    onClick={() => setChemChecklist(prev => ({
                      ...prev,
                      tablets: { ...prev.tablets, amount: (Number(prev.tablets.amount || 0) + 1).toString() }
                    }))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-extrabold text-lg select-none"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* HCL Liters */}
              <div className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                chemChecklist.hcl.checked 
                  ? 'border-[#52b197] bg-[#ebf7f4] shadow-sm' 
                  : `${COOL_PALETTE_CHEMICALS.hcl.border} ${COOL_PALETTE_CHEMICALS.hcl.bg}`
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setNoChemicals(false);
                    setChemChecklist(prev => ({ ...prev, hcl: { ...prev.hcl, checked: !prev.hcl.checked } }));
                  }}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-150 ${
                    chemChecklist.hcl.checked ? 'bg-[#52b197] border-[#52b197] text-white' : 'border-slate-300 bg-white/70'
                  }`}>
                    {chemChecklist.hcl.checked && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full flex-shrink-0 ${chemChecklist.hcl.checked ? 'bg-[#52b197]' : COOL_PALETTE_CHEMICALS.hcl.dot}`} />
                    <span className={`font-extrabold text-sm ${chemChecklist.hcl.checked ? 'text-[#1d5244]' : COOL_PALETTE_CHEMICALS.hcl.text}`}>
                      HCL (Liters)
                    </span>
                  </div>
                </button>
                
                {/* Tactile Counter */}
                <div className={`flex items-center gap-1.5 transition-all duration-200 ${
                  chemChecklist.hcl.checked ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}>
                  <button
                    type="button"
                    onClick={() => setChemChecklist(prev => ({
                      ...prev,
                      hcl: { ...prev.hcl, amount: Math.max(0, Number(prev.hcl.amount || 0) - 1).toString() }
                    }))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-extrabold text-lg select-none"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    aria-label="HCL Liters amount"
                    value={chemChecklist.hcl.amount}
                    onChange={e => setChemChecklist(prev => ({
                      ...prev,
                      hcl: { ...prev.hcl, amount: e.target.value }
                    }))}
                    className="w-12 text-center font-extrabold text-sm text-[#0f2942] focus-ring border border-slate-200 rounded-xl py-1.5 bg-white/80"
                  />
                  <button
                    type="button"
                    onClick={() => setChemChecklist(prev => ({
                      ...prev,
                      hcl: { ...prev.hcl, amount: (Number(prev.hcl.amount || 0) + 1).toString() }
                    }))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/80 hover:bg-slate-200 text-slate-700 font-extrabold text-lg select-none"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Chlorine Granules */}
              <div className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                chemChecklist.granules.checked 
                  ? 'border-[#52b197] bg-[#ebf7f4] shadow-sm' 
                  : `${COOL_PALETTE_CHEMICALS.granules.border} ${COOL_PALETTE_CHEMICALS.granules.bg}`
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setNoChemicals(false);
                    setChemChecklist(prev => ({ ...prev, granules: { ...prev.granules, checked: !prev.granules.checked } }));
                  }}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-150 ${
                    chemChecklist.granules.checked ? 'bg-[#52b197] border-[#52b197] text-white' : 'border-slate-300 bg-white/70'
                  }`}>
                    {chemChecklist.granules.checked && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full flex-shrink-0 ${chemChecklist.granules.checked ? 'bg-[#52b197]' : COOL_PALETTE_CHEMICALS.granules.dot}`} />
                    <span className={`font-extrabold text-sm ${chemChecklist.granules.checked ? 'text-[#1d5244]' : COOL_PALETTE_CHEMICALS.granules.text}`}>
                      Chlorine (Granules/Powder)
                    </span>
                  </div>
                </button>
                
                {/* KG Input */}
                <div className={`flex items-center gap-2 transition-all duration-200 ${
                  chemChecklist.granules.checked ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0.0"
                    aria-label="Chlorine Granules amount"
                    value={chemChecklist.granules.amount}
                    onChange={e => setChemChecklist(prev => ({
                      ...prev,
                      granules: { ...prev.granules, amount: e.target.value }
                    }))}
                    className="w-20 text-center font-extrabold text-sm text-[#0f2942] focus-ring border border-slate-200 rounded-xl py-1.5 outline-none bg-white/80"
                  />
                  <span className={`text-xs font-black ${chemChecklist.granules.checked ? 'text-[#1d5244]' : 'text-[#5d7390]'}`}>KG</span>
                </div>
              </div>

              {/* Soda Ash */}
              <div className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                chemChecklist.soda_ash.checked 
                  ? 'border-[#52b197] bg-[#ebf7f4] shadow-sm' 
                  : `${COOL_PALETTE_CHEMICALS.soda_ash.border} ${COOL_PALETTE_CHEMICALS.soda_ash.bg}`
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setNoChemicals(false);
                    setChemChecklist(prev => ({ ...prev, soda_ash: { ...prev.soda_ash, checked: !prev.soda_ash.checked } }));
                  }}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-150 ${
                    chemChecklist.soda_ash.checked ? 'bg-[#52b197] border-[#52b197] text-white' : 'border-slate-300 bg-white/70'
                  }`}>
                    {chemChecklist.soda_ash.checked && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full flex-shrink-0 ${chemChecklist.soda_ash.checked ? 'bg-[#52b197]' : COOL_PALETTE_CHEMICALS.soda_ash.dot}`} />
                    <span className={`font-extrabold text-sm ${chemChecklist.soda_ash.checked ? 'text-[#1d5244]' : COOL_PALETTE_CHEMICALS.soda_ash.text}`}>
                      Soda Ash
                    </span>
                  </div>
                </button>
                
                {/* KG Input */}
                <div className={`flex items-center gap-2 transition-all duration-200 ${
                  chemChecklist.soda_ash.checked ? 'opacity-100' : 'opacity-40 pointer-events-none'
                }`}>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0.0"
                    aria-label="Soda Ash amount"
                    value={chemChecklist.soda_ash.amount}
                    onChange={e => setChemChecklist(prev => ({
                      ...prev,
                      soda_ash: { ...prev.soda_ash, amount: e.target.value }
                    }))}
                    className="w-20 text-center font-extrabold text-sm text-[#0f2942] focus-ring border border-slate-200 rounded-xl py-1.5 outline-none bg-white/80"
                  />
                  <span className={`text-xs font-black ${chemChecklist.soda_ash.checked ? 'text-[#1d5244]' : 'text-[#5d7390]'}`}>KG</span>
                </div>
              </div>

              {/* Other Chemical */}
              <div className={`rounded-2xl border p-4 transition-all duration-200 ${
                chemChecklist.other.checked 
                  ? 'border-[#52b197] bg-[#ebf7f4] shadow-sm' 
                  : `${COOL_PALETTE_CHEMICALS.other.border} ${COOL_PALETTE_CHEMICALS.other.bg}`
              }`}>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setNoChemicals(false);
                      setChemChecklist(prev => ({
                        ...prev,
                        other: {
                          ...prev.other,
                          checked: !prev.other.checked,
                          name: !prev.other.checked ? prev.other.name : '',
                          amount: '1',
                          unit: 'other' as const
                        }
                      }));
                    }}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-150 ${
                      chemChecklist.other.checked ? 'bg-[#52b197] border-[#52b197] text-white' : 'border-slate-300 bg-white/70'
                    }`}>
                      {chemChecklist.other.checked && (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className={`h-3 w-3 rounded-full flex-shrink-0 ${chemChecklist.other.checked ? 'bg-[#52b197]' : COOL_PALETTE_CHEMICALS.other.dot}`} />
                      <span className={`font-extrabold text-sm ${chemChecklist.other.checked ? 'text-[#1d5244]' : COOL_PALETTE_CHEMICALS.other.text}`}>
                        Other Chemical
                      </span>
                    </div>
                  </button>
                </div>
                
                {/* Other Input Field */}
                {chemChecklist.other.checked && (
                  <div className="mt-3 animate-fade-in">
                    <input
                      type="text"
                      placeholder="e.g. 5 caps of Algaecide, clarifier, etc."
                      aria-label="Other chemical details"
                      value={chemChecklist.other.name}
                      onChange={e => setChemChecklist(prev => ({
                        ...prev,
                        other: { ...prev.other, name: e.target.value, amount: '1', unit: 'other' as const }
                      }))}
                      className="focus-ring min-h-12 w-full rounded-2xl border border-[#c5d5e3] px-4 text-sm font-bold text-ink outline-none bg-white/80 placeholder:text-slate-300"
                    />
                  </div>
                )}
              </div>

              {/* No Chemicals Added */}
              <div className={`flex items-center justify-between rounded-2xl border p-4 transition-all duration-200 ${
                noChemicals 
                  ? 'border-[#52b197] bg-[#ebf7f4] shadow-sm' 
                  : `${COOL_PALETTE_CHEMICALS.no_chemicals.border} ${COOL_PALETTE_CHEMICALS.no_chemicals.bg}`
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !noChemicals;
                    setNoChemicals(nextVal);
                    if (nextVal) {
                      // Uncheck all other options
                      setChemChecklist(prev => ({
                        tablets: { ...prev.tablets, checked: false, amount: '1' },
                        hcl: { ...prev.hcl, checked: false, amount: '1' },
                        granules: { ...prev.granules, checked: false, amount: '' },
                        soda_ash: { ...prev.soda_ash, checked: false, amount: '' },
                        other: { ...prev.other, checked: false, name: '', amount: '' },
                      }));
                    }
                  }}
                  className="flex items-center gap-3 text-left flex-1 min-w-0"
                >
                  <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border transition-all duration-150 ${
                    noChemicals ? 'bg-[#52b197] border-[#52b197] text-white' : 'border-slate-300 bg-white/70'
                  }`}>
                    {noChemicals && (
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`h-3 w-3 rounded-full flex-shrink-0 ${noChemicals ? 'bg-[#52b197]' : COOL_PALETTE_CHEMICALS.no_chemicals.dot}`} />
                    <span className={`font-extrabold text-sm ${noChemicals ? 'text-[#1d5244]' : COOL_PALETTE_CHEMICALS.no_chemicals.text}`}>
                      NO CHEMICALS ADDED
                    </span>
                  </div>
                </button>
              </div>

            </div>
            
            {/* Validation Errors for Chemicals */}
            {(errors.tablets || errors.hcl || errors.granules || errors.soda_ash || errors.other || errors.chemicals_checklist) && (
              <p className="mt-3 text-xs font-bold text-red-600">
                {errors.tablets || errors.hcl || errors.granules || errors.soda_ash || errors.other || errors.chemicals_checklist}
              </p>
            )}
          </Section>

          {/* Section 4: Pool Cleaning Checklist */}
          <Section number="4" title="Pool Cleaning" detail="optional">
            <p className="text-xs text-[#5d7390] font-semibold mb-4">Select everything you did, then save.</p>
            <div className="space-y-2.5">
              {CHECKLIST_ITEMS.map(item => {
                const isChecked = checkedItems[item.id];
                const colors = COOL_PALETTE_CLEANING[item.id];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 shadow-sm transition-all text-left ${
                      isChecked 
                        ? 'border-[#52b197] bg-[#ebf7f4] shadow-sm' 
                        : `${colors.border} ${colors.bg} ${colors.hoverBg}`
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Cool decorative colored dot instead of icon */}
                      <span className={`h-3.5 w-3.5 rounded-full flex-shrink-0 ${isChecked ? 'bg-[#52b197]' : colors.dot}`} />
                      <span className={`font-extrabold text-sm ${isChecked ? 'text-[#1d5244]' : colors.text}`}>
                        {item.label}
                      </span>
                    </div>
                    
                    {/* Tick Circle Indicator */}
                    <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                      isChecked 
                        ? 'bg-[#52b197] border-[#52b197] text-white' 
                        : 'border-slate-300 bg-white/70'
                    }`}>
                      {isChecked && (
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {errors.checklist && (
              <p className="mt-3 text-xs font-bold text-red-600">{errors.checklist}</p>
            )}
          </Section>

          {/* Section 5: Additional Notes */}
          <Section number="5" title="Additional Notes" detail="optional">
            <textarea 
              aria-label="Additional notes" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              placeholder="Anything worth noting..." 
              rows={3} 
              className="focus-ring w-full resize-y rounded-2xl border border-[#c5d5e3] p-4 text-sm font-semibold outline-none" 
            />
          </Section>

          {errors.form && (
            <div role="alert" className="rounded-2xl bg-red-50 border border-red-100 p-4 text-sm font-bold text-red-700">
              {errors.form}
            </div>
          )}

          <button 
            type="submit" 
            disabled={saving} 
            className="focus-ring min-h-14 w-full rounded-2xl bg-blue font-extrabold tracking-wide text-white shadow-soft hover:bg-blue/90 disabled:cursor-wait disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99] transition-all text-base"
          >
            {saving ? 'SAVING VISIT…' : 'SAVE VISIT'}
          </button>
        </form>
      </div>
    </main>
  );
}
