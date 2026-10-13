// Prepares job-site photos on the device before upload:
//   - reads when and where the photo was taken (from the photo itself,
//     or the phone's location when it was just taken),
//   - shrinks it so uploads finish on a weak cell signal,
//   - stamps the project, date/time and GPS onto the image so the record
//     stays with the photo wherever it is copied.
import exifr from 'exifr';

const MAX_EDGE = 1920;      // longest side in pixels
const JPEG_QUALITY = 0.78;
const RECENT_MINUTES = 30;  // only use phone location for photos taken this recently

async function readMetadata(file) {
  try {
    const data = await exifr.parse(file, { pick: ['DateTimeOriginal', 'CreateDate'], gps: true });
    return {
      takenAt: data?.DateTimeOriginal || data?.CreateDate || null,
      latitude: data?.latitude ?? null,
      longitude: data?.longitude ?? null,
    };
  } catch {
    return { takenAt: null, latitude: null, longitude: null };
  }
}

function deviceLocation() {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 5 * 60_000 },
    );
  });
}

async function loadImage(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // fall back to an <img> element below
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function formatStamp(date) {
  return date.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function drawStamp(ctx, width, height, lines) {
  const fontSize = Math.max(14, Math.round(width / 55));
  const pad = Math.round(fontSize * 0.6);
  const barHeight = lines.length * fontSize * 1.3 + pad * 2;
  ctx.fillStyle = 'rgba(15, 42, 94, 0.78)';
  ctx.fillRect(0, height - barHeight, width, barHeight);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  lines.forEach((line, i) => {
    ctx.font = `${i === 0 ? '600 ' : ''}${fontSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(line, pad, height - barHeight + pad + i * fontSize * 1.3, width - pad * 2);
  });
}

// Returns { blob, taken_at, latitude, longitude } ready to upload.
export async function preparePhoto(file, { projectName } = {}) {
  const meta = await readMetadata(file);
  const takenAt = meta.takenAt ? new Date(meta.takenAt) : new Date(file.lastModified || Date.now());

  let { latitude, longitude } = meta;
  const isRecent = Date.now() - takenAt.getTime() < RECENT_MINUTES * 60_000;
  if ((latitude == null || longitude == null) && isRecent) {
    const here = await deviceLocation();
    if (here) ({ latitude, longitude } = here);
  }

  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  if (img.close) img.close();

  const where = latitude != null ? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` : 'Location not recorded';
  drawStamp(ctx, width, height, [projectName || 'Whayland job site', `${formatStamp(takenAt)}  ·  ${where}`]);

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not process photo'))), 'image/jpeg', JPEG_QUALITY),
  );

  return {
    blob,
    taken_at: takenAt.toISOString(),
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  };
}
