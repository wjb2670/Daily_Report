import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const TECH_COLORS = ['#1d4ed8', '#c2410c', '#15803d', '#7e22ce', '#be123c', '#0e7490'];

const stopIcon = (n, color) => L.divIcon({
  className: '',
  html: `<div style="background:${color};color:#fff;width:28px;height:28px;border-radius:50%;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font:700 13px system-ui">${n}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const shopIcon = L.divIcon({
  className: '',
  html: '<div style="background:#0f2a5e;color:#fff;padding:3px 7px;border-radius:6px;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);font:800 11px system-ui;white-space:nowrap">SHOP</div>',
  iconSize: [44, 22],
  iconAnchor: [22, 11],
});

function FitAll({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return undefined;
    // Wait for the map to have its final size before zooming to fit.
    const t = setTimeout(() => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: 12, animate: false });
    }, 100);
    return () => clearTimeout(t);
  }, [map, JSON.stringify(points)]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Shop, each tech's numbered stops, and the driving loop from the shop and back.
export default function RouteMap({ shop, routes }) {
  const points = [[shop.lat, shop.lon], ...routes.flatMap(r => r.stops.map(s => [s.lat, s.lon]))];
  return (
    <MapContainer center={[shop.lat, shop.lon]} zoom={10} zoomSnap={0.25} scrollWheelZoom={false} style={{ height: 380, width: '100%', borderRadius: 12 }}>
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitAll points={points} />
      <Marker position={[shop.lat, shop.lon]} icon={shopIcon}><Tooltip>Shop</Tooltip></Marker>
      {routes.map((r, ri) => {
        const color = TECH_COLORS[ri % TECH_COLORS.length];
        const line = [[shop.lat, shop.lon], ...r.stops.map(s => [s.lat, s.lon]), [shop.lat, shop.lon]];
        return (
          <React.Fragment key={r.tech}>
            {r.stops.length > 0 && <Polyline positions={line} pathOptions={{ color, weight: 3, opacity: 0.75, dashArray: '6 6' }} />}
            {r.stops.map((s, i) => (
              <Marker key={s.id} position={[s.lat, s.lon]} icon={stopIcon(i + 1, color)}>
                <Tooltip>{r.tech} · stop {i + 1}: {s.farm}</Tooltip>
              </Marker>
            ))}
          </React.Fragment>
        );
      })}
    </MapContainer>
  );
}
