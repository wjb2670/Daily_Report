import React, { useRef, useState } from 'react';
import { Camera, Images, Loader2, Trash2 } from 'lucide-react';
import { photoQueue } from '@/lib/dailyReportStore';
import { PhotoImage, PendingBadge, preparePhotos, isTicket } from './photoTools';

// Ticket photos for one delivery: thumbnails plus buttons to add more.
export default function DeliveryTickets({ delivery, report, onChangePhotos, syncStatus, disabled, toast }) {
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);
  const [processing, setProcessing] = useState(0);
  const tickets = (report.photos || []).filter(p => isTicket(p) && p.delivery_id === delivery.id);

  const handleFiles = async e => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setProcessing(n => n + files.length);
    const added = await preparePhotos(files, {
      stamp: `${report.project_name} · Delivery ticket: ${delivery.material}`,
      idPrefix: 't',
      extra: { category: 'ticket', delivery_id: delivery.id, caption: `Delivery ticket — ${delivery.material}${delivery.supplier ? ` (${delivery.supplier})` : ''}` },
      onError: (err, file) => toast({ title: 'Ticket photo could not be added', description: err.message || file.name, variant: 'destructive' }),
    });
    setProcessing(n => n - files.length);
    if (added.length) onChangePhotos(current => [...current, ...added]);
  };

  const remove = photo => {
    if (!window.confirm('Remove this ticket photo?')) return;
    onChangePhotos(current => current.filter(p => p.id !== photo.id));
    if (photo.pending) photoQueue.remove(photo.id).catch(() => {});
  };

  return (
    <div className="mt-2 space-y-2">
      {tickets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tickets.map(t => (
            <div key={t.id} className="relative w-24 h-24 rounded-md overflow-hidden border border-gray-200 bg-gray-100">
              <PhotoImage photo={t} className="w-full h-full object-cover" />
              {t.pending && <PendingBadge syncStatus={syncStatus} />}
              {!disabled && (
                <button type="button" onClick={() => remove(t)} aria-label="Remove ticket photo"
                  className="absolute bottom-1 right-1 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 text-red-600 shadow">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
          <input ref={libraryRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <button type="button" onClick={() => cameraRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">
            <Camera className="w-4 h-4" /> {tickets.length ? 'Add another ticket photo' : 'Take ticket photo'}
          </button>
          <button type="button" onClick={() => libraryRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium">
            <Images className="w-4 h-4" /> From photos
          </button>
          {processing > 0 && <span className="inline-flex items-center gap-1 text-xs text-gray-500"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</span>}
        </div>
      )}
    </div>
  );
}
