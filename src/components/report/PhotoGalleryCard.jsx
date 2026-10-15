import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Images, Trash2, Loader2, CloudOff, MapPin } from 'lucide-react';
import Section from './Section';
import { preparePhoto, formatStamp } from '@/lib/photos';
import { photoQueue } from '@/lib/dailyReportStore';

const newId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export default function PhotoGalleryCard({ report, onChangePhotos, syncStatus, disabled, toast, instruction }) {
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const [processing, setProcessing] = useState(0);
  const [previews, setPreviews] = useState({}); // photo id → local object URL
  const photos = report?.photos || [];

  // Photos still waiting to upload are shown from the copy saved on this device.
  useEffect(() => {
    let cancelled = false;
    for (const p of photos) {
      if (p.pending && !previews[p.id]) {
        photoQueue.get(p.id).then(blob => {
          if (blob && !cancelled) setPreviews(v => (v[p.id] ? v : { ...v, [p.id]: URL.createObjectURL(blob) }));
        }).catch(() => {});
      }
    }
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.map(p => `${p.id}:${p.pending ? 1 : 0}`).join(',')]);

  useEffect(() => () => Object.values(previews).forEach(u => URL.revokeObjectURL(u)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFiles = async e => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setProcessing(n => n + files.length);
    const added = [];
    for (const file of files) {
      try {
        const prepared = await preparePhoto(file, { projectName: report.project_name });
        const id = newId();
        await photoQueue.put(id, prepared.blob);
        setPreviews(v => ({ ...v, [id]: URL.createObjectURL(prepared.blob) }));
        added.push({
          id,
          caption: '',
          taken_at: prepared.taken_at,
          latitude: prepared.latitude,
          longitude: prepared.longitude,
          pending: true,
        });
      } catch (err) {
        toast({ title: 'Photo could not be added', description: err.message || file.name, variant: 'destructive' });
      } finally {
        setProcessing(n => n - 1);
      }
    }
    if (added.length) onChangePhotos(current => [...current, ...added]);
  };

  const remove = photo => {
    if (!window.confirm('Remove this photo from the report?')) return;
    onChangePhotos(current => current.filter(p => p.id !== photo.id));
    if (photo.pending) photoQueue.remove(photo.id).catch(() => {});
  };

  const setCaption = (id, caption) => onChangePhotos(current => current.map(p => (p.id === id ? { ...p, caption } : p)));

  const waiting = photos.filter(p => p.pending).length;

  return (
    <Section
      instruction={disabled ? null : instruction}
      icon={Camera}
      tone="purple"
      title="Photos"
      subtitle={waiting ? `${waiting} waiting to upload${syncStatus === 'offline' ? ' when signal returns' : ''}` : `${photos.length} on this report`}
    >
      {!disabled && (
        <div className="flex flex-wrap gap-2 mb-4">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
          <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <Button onClick={() => cameraRef.current?.click()} disabled={!report} className="bg-[#1e3a8a] hover:bg-[#0f2a5e] text-white font-semibold h-11">
            <Camera className="w-4 h-4 mr-1.5" /> Take photo
          </Button>
          <Button variant="outline" onClick={() => libraryRef.current?.click()} disabled={!report} className="h-11">
            <Images className="w-4 h-4 mr-1.5" /> Choose photos
          </Button>
          {processing > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Preparing {processing}…</span>
          )}
        </div>
      )}

      {photos.length > 0 ? (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => {
            const src = photo.url || previews[photo.id];
            return (
              <figure key={photo.id} className="rounded-lg overflow-hidden border border-gray-200 bg-white">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {src ? (
                    <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={photo.caption || 'Job site photo'} className="w-full h-full object-cover object-bottom" /></a>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-gray-400 p-2 text-center">Uploading from another device</div>
                  )}
                  {photo.pending && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/90 text-white text-[11px] font-semibold px-2 py-0.5">
                      {syncStatus === 'saving' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudOff className="w-3 h-3" />}
                      {syncStatus === 'saving' ? 'Uploading' : 'Not uploaded yet'}
                    </span>
                  )}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => remove(photo)}
                      aria-label="Remove photo"
                      className="absolute top-1.5 right-1.5 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/90 text-red-600 shadow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <figcaption className="p-2 space-y-1">
                  <input
                    className="w-full text-base md:text-sm rounded-md border border-gray-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]"
                    placeholder="Add a caption…"
                    value={photo.caption || ''}
                    onChange={e => setCaption(photo.id, e.target.value)}
                    disabled={disabled}
                  />
                  <div className="text-[11px] text-gray-500 flex flex-wrap gap-x-2">
                    {photo.taken_at && <span>{formatStamp(new Date(photo.taken_at))}</span>}
                    {photo.latitude != null && <span className="inline-flex items-center gap-0.5"><MapPin className="w-3 h-3" />GPS</span>}
                  </div>
                </figcaption>
              </figure>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-400 text-sm italic">No photos yet.</p>
      )}
    </Section>
  );
}
