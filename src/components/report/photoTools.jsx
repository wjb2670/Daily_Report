import React, { useEffect, useState } from 'react';
import { Loader2, CloudOff } from 'lucide-react';
import { preparePhoto } from '@/lib/photos';
import { photoQueue } from '@/lib/dailyReportStore';
import { useResolvedSrc } from '@/lib/resolveImage';

// Ticket photo ids start with "t" so they can be filed separately.
export const newPhotoId = (prefix = 'p') => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const isTicket = photo => photo?.category === 'ticket';

// Shrinks, stamps and stores photos on the device, returning the entries to
// add to the report. They upload with the report when there's signal.
export async function preparePhotos(files, { stamp, extra = {}, idPrefix = 'p', onError }) {
  const added = [];
  for (const file of files) {
    try {
      const prepared = await preparePhoto(file, { projectName: stamp });
      const id = newPhotoId(idPrefix);
      await photoQueue.put(id, prepared.blob);
      added.push({
        id,
        caption: '',
        taken_at: prepared.taken_at,
        latitude: prepared.latitude,
        longitude: prepared.longitude,
        pending: true,
        ...extra,
      });
    } catch (err) {
      onError?.(err, file);
    }
  }
  return added;
}

// The copy saved on this device while waiting for signal, otherwise the uploaded photo.
function useLocalPreview(photo) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!photo.pending) return undefined;
    let made = null;
    let cancelled = false;
    photoQueue.get(photo.id).then(blob => {
      if (blob && !cancelled) { made = URL.createObjectURL(blob); setUrl(made); }
    }).catch(() => {});
    return () => { cancelled = true; if (made) URL.revokeObjectURL(made); };
  }, [photo.id, photo.pending]);
  return photo.pending ? url : null;
}

export function PhotoImage({ photo, className = 'w-full h-full object-cover object-bottom' }) {
  const preview = useLocalPreview(photo);
  const uploaded = useResolvedSrc(preview ? null : photo.url);
  const src = preview || uploaded;
  if (!src) {
    return (
      <div className="flex items-center justify-center h-full text-xs text-gray-400 p-2 text-center">
        {photo.url ? 'Loading photo…' : 'Uploading from another device'}
      </div>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block w-full h-full">
      <img src={src} alt={photo.caption || 'Job site photo'} className={className} />
    </a>
  );
}

export function PendingBadge({ syncStatus }) {
  const saving = syncStatus === 'saving';
  return (
    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-amber-500/90 text-white text-[11px] font-semibold px-2 py-0.5">
      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudOff className="w-3 h-3" />}
      {saving ? 'Uploading' : 'Not uploaded yet'}
    </span>
  );
}
