// Job-site weather from the National Weather Service (api.weather.gov).
//
// The report records two readings: the observation nearest 7:00 AM and the
// one nearest 2:00 PM, in the project's own time zone. NWS keeps about a week
// of station history, so a reading is correct even when the report is opened
// later in the day — it is looked up for the slot time, not "right now".

const NWS = 'https://api.weather.gov';

export const WEATHER_SLOTS = {
  am: { hour: 7, label: '7:00 AM' },
  pm: { hour: 14, label: '2:00 PM' },
};

// Readings farther than this from the slot time are treated as missing.
const MAX_GAP_MINUTES = 90;

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/geo+json' } });
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
  return res.json();
}

// ---- Location -------------------------------------------------------------

// Address → coordinates using OpenStreetMap's free lookup. Tries the full
// street address first, then city/state, then ZIP.
export async function geocodeProject(project) {
  const attempts = [];
  const street = [project.address, project.city, project.state, project.zip].filter(Boolean).join(', ');
  if (project.address && (project.city || project.zip)) attempts.push({ q: street });
  if (project.city && project.state) attempts.push({ q: `${project.city}, ${project.state}` });
  if (project.zip) attempts.push({ postalcode: project.zip, country: 'us' });

  for (const params of attempts) {
    const qs = new URLSearchParams({ ...params, format: 'json', limit: '1', countrycodes: 'us' });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`);
      if (!res.ok) continue;
      const [hit] = await res.json();
      if (hit) return { latitude: Number(hit.lat), longitude: Number(hit.lon) };
    } catch {
      // try the next form of the address
    }
  }
  return null;
}

// ---- Time zones -----------------------------------------------------------

// Offset (ms) of a time zone from UTC at a given instant.
function tzOffsetMs(timeZone, instant) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instant));
  const v = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const asUtc = Date.UTC(+v.year, +v.month - 1, +v.day, +v.hour, +v.minute, +v.second);
  return asUtc - instant;
}

// The UTC instant of `hour`:00 on `dateStr` (YYYY-MM-DD) in `timeZone`.
export function slotInstant(dateStr, hour, timeZone) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hour, 0, 0);
  let instant = wallAsUtc - tzOffsetMs(timeZone, wallAsUtc);
  // Re-check once in case the first guess crossed a daylight-saving change.
  instant = wallAsUtc - tzOffsetMs(timeZone, instant);
  return instant;
}

// ---- Conversions ----------------------------------------------------------

const round = (n, places = 0) => (n == null || Number.isNaN(n) ? null : Number(n.toFixed(places)));
const cToF = c => (c == null ? null : round(c * 9 / 5 + 32));
const kmhToMph = k => (k == null ? null : round(k * 0.621371));
const mmToIn = mm => (mm == null ? null : round(mm / 25.4, 2));

function compass(deg) {
  if (deg == null) return null;
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Turn one NWS observation into the reading saved on the report.
export function toReading(obs, station, point) {
  const p = obs.properties;
  return {
    observed_at: p.timestamp,
    condition: p.textDescription || null,
    temperature_f: cToF(p.temperature?.value),
    humidity_percent: round(p.relativeHumidity?.value),
    wind_mph: kmhToMph(p.windSpeed?.value),
    wind_gust_mph: kmhToMph(p.windGust?.value),
    wind_direction: compass(p.windDirection?.value),
    precip_last_hour_in: mmToIn(p.precipitationLastHour?.value),
    station_id: station.id,
    station_name: station.name,
    location: point.place,
    source: 'National Weather Service',
    recorded_at: new Date().toISOString(),
  };
}

// The observation nearest `targetMs` that has a temperature, within the gap.
export function nearestObservation(features, targetMs) {
  let best = null;
  for (const f of features || []) {
    if (f?.properties?.temperature?.value == null) continue;
    const gap = Math.abs(Date.parse(f.properties.timestamp) - targetMs);
    if (gap <= MAX_GAP_MINUTES * 60_000 && (!best || gap < best.gap)) best = { f, gap };
  }
  return best?.f || null;
}

// ---- NWS lookups ----------------------------------------------------------

const pointCache = new Map();

// Grid point for the coordinates: time zone, place name and nearby stations.
async function getPoint(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (pointCache.has(key)) return pointCache.get(key);
  const promise = (async () => {
    const point = await getJson(`${NWS}/points/${key}`);
    const props = point.properties;
    const stations = await getJson(props.observationStations);
    const rel = props.relativeLocation?.properties;
    return {
      timeZone: props.timeZone,
      place: rel ? `${rel.city}, ${rel.state}` : null,
      stations: (stations.features || []).slice(0, 3).map(s => ({
        id: s.properties.stationIdentifier,
        name: s.properties.name,
      })),
    };
  })();
  pointCache.set(key, promise);
  promise.catch(() => pointCache.delete(key));
  return promise;
}

// Project time zone for coordinates (falls back to Eastern).
export async function getTimeZone(lat, lon) {
  try {
    return (await getPoint(lat, lon)).timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}

// Reading for one slot ('am' | 'pm') on a date. Returns null when the slot
// time hasn't arrived yet; throws when no station has a usable reading.
export async function fetchSlotReading({ latitude, longitude }, dateStr, slot) {
  const point = await getPoint(latitude, longitude);
  const target = slotInstant(dateStr, WEATHER_SLOTS[slot].hour, point.timeZone);
  if (Date.now() < target) return null;

  const start = new Date(target - MAX_GAP_MINUTES * 60_000).toISOString();
  const end = new Date(target + MAX_GAP_MINUTES * 60_000).toISOString();

  for (const station of point.stations) {
    try {
      const qs = new URLSearchParams({ start, end });
      const data = await getJson(`${NWS}/stations/${station.id}/observations?${qs}`);
      const obs = nearestObservation(data.features, target);
      if (obs) return toReading(obs, station, point);
    } catch {
      // try the next-nearest station
    }
  }
  throw new Error('No nearby weather station had a reading for that time.');
}
