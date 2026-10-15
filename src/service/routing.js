// Finding farms on the map and building each tech's route for the day.

// ---- Address → coordinates (OpenStreetMap, free) --------------------------------

async function nominatim(params) {
  const qs = new URLSearchParams({ ...params, format: 'json', limit: '1', countrycodes: 'us' });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${qs}`);
  if (!res.ok) return null;
  const [hit] = await res.json();
  return hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
}

// Tries the exact address first. Rural routes often aren't on the map, so it
// falls back to the town / ZIP and says so, so the office can check it.
export async function locate({ address, city, state, zip }) {
  try {
    if (address && (city || zip)) {
      const exact = await nominatim({ street: address, city: city || '', state: state || '', postalcode: zip || '' });
      if (exact) return { ...exact, note: '' };
    }
    if (zip) {
      const byZip = await nominatim({ postalcode: zip, country: 'us' });
      if (byZip) return { ...byZip, note: `Approximate — ZIP ${zip} area` };
    }
    if (city && state) {
      const byTown = await nominatim({ city, state });
      if (byTown) return { ...byTown, note: `Approximate — ${city}, ${state}` };
    }
  } catch {
    // no signal or lookup failed
  }
  return { lat: null, lon: null, note: 'Location not found — check the address' };
}

// A typed address in one line (used for the shop).
export async function locateText(q) {
  try { return await nominatim({ q }); } catch { return null; }
}

// ---- Distances --------------------------------------------------------------

const ROAD_FACTOR = 1.3;  // country roads are longer than a straight line
const AVG_MPH = 40;

export function miles(a, b) {
  const R = 3958.8;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * ROAD_FACTOR;
}

export const driveMinutes = mi => Math.round((mi / AVG_MPH) * 60);

const hasPoint = c => c.lat != null && c.lon != null;

function routeMiles(shop, stops) {
  let total = 0;
  let at = shop;
  for (const s of stops) { total += miles(at, s); at = s; }
  return total + (stops.length ? miles(at, shop) : 0);
}

// Best visiting order for a set of stops, starting and ending at the shop:
// nearest-next, then untangle any crossing legs (2-opt).
export function orderStops(shop, stops) {
  const left = [...stops];
  const order = [];
  let at = shop;
  while (left.length) {
    let best = 0;
    for (let i = 1; i < left.length; i++) if (miles(at, left[i]) < miles(at, left[best])) best = i;
    at = left.splice(best, 1)[0];
    order.push(at);
  }
  let improved = true;
  while (improved && order.length > 3) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let k = i + 1; k < order.length; k++) {
        const next = [...order.slice(0, i), ...order.slice(i, k + 1).reverse(), ...order.slice(k + 1)];
        if (routeMiles(shop, next) + 0.01 < routeMiles(shop, order)) { order.splice(0, order.length, ...next); improved = true; }
      }
    }
  }
  return order;
}

// Builds the day's plan.
//   - The oldest open call goes to the first tech, and that tech's day is
//     filled with the open calls closest to it.
//   - The next tech starts from the oldest call still unassigned, and so on.
//   - Each route is then put in driving order from the shop and back.
export function planDay({ calls, techs, shop, stopsPerTech }) {
  const pool = calls.filter(hasPoint).sort((a, b) => String(a.received).localeCompare(String(b.received)));
  const routes = [];
  for (const tech of techs) {
    if (!pool.length) { routes.push({ tech, stops: [] }); continue; }
    const anchor = pool.shift();
    const picks = [anchor];
    while (picks.length < stopsPerTech && pool.length) {
      // closest remaining call to anything already on this route
      let bestIdx = 0;
      let bestDist = Infinity;
      pool.forEach((c, i) => {
        const d = Math.min(...picks.map(p => miles(p, c)));
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      });
      picks.push(pool.splice(bestIdx, 1)[0]);
    }
    routes.push({ tech, stops: orderStops(shop, picks) });
  }
  return { routes: routes.map(r => withTotals(shop, r)), leftover: pool, unlocated: calls.filter(c => !hasPoint(c)) };
}

export function withTotals(shop, route) {
  const mi = routeMiles(shop, route.stops);
  return { ...route, miles: mi, minutes: driveMinutes(mi) };
}

// Google Maps directions from the shop, through each stop, back to the shop.
export function mapsLink(shop, stops) {
  const pt = p => `${p.lat},${p.lon}`;
  const parts = [pt(shop), ...stops.map(pt), pt(shop)];
  return `https://www.google.com/maps/dir/${parts.map(encodeURIComponent).join('/')}`;
}
