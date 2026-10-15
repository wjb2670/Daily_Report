import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Images, Trash2, Loader2, MapPin } from 'lucide-react';
import Section from './Section';
import { formatStamp } from '@/lib/photos';
import { photoQueue } from '@/lib/dailyReportStore';
import { PhotoImage, PendingBadge, preparePhotos, isTicket } from './photoTools';

export default function PhotoGalleryCard({ report, onChangePhotos, syncStatus, disabled, toast, instruction }) {
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const [processing, setProcessing] = useState(0);
  // Delivery ticket photos live with their delivery, not in this gallery.
  const photos = (report?.photos || []).filter(p => !isTicket(p));

  const handleFiles = async e => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setProcessing(n => n + files.length);
    const added = await preparePhotos(files, {
      stamp: report.project_name,
      onError: (err, file) => toast({ title: 'Photo could not be added', description: err.message || file.name, variant: 'destructive' }),
    });
    setProcessing(n => n - files.length);
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
            return (
              <figure key={photo.id} className="rounded-lg overflow-hidden border border-gray-200 bg-white">
                <div className="relative aspect-[4/3] bg-gray-100">
                  <PhotoImage photo={photo} />
                  {photo.pending && <PendingBadge syncStatus={syncStatus} />}
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
