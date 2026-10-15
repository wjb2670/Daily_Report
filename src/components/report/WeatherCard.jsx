import React, { useEffect, useRef, useState } from 'react';
import { CloudSun, Thermometer, Wind, Droplets, CloudRain, Loader2, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import Section from './Section';
import { WEATHER_SLOTS, fetchSlotReading, geocodeProject } from '@/lib/weather';

const CHECK_EVERY_MS = 5 * 60_000;

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
}

function Reading({ slot, reading, state, onRetry }) {
  const label = WEATHER_SLOTS[slot].label;
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[#0f2a5e]">{label} reading</span>
        {reading && <span className="text-xs text-gray-500">Observed {formatTime(reading.observed_at)}</span>}
      </div>
      {reading ? (
        <>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5"><Thermometer className="w-4 h-4 text-red-500" /><span className="text-lg font-bold text-[#0f2a5e]">{reading.temperature_f ?? '—'}°F</span></div>
            <div className="flex items-center gap-1.5"><CloudSun className="w-4 h-4 text-amber-500" /><span>{reading.condition || '—'}</span></div>
            <div className="flex items-center gap-1.5"><Wind className="w-4 h-4 text-slate-500" /><span>{reading.wind_mph ?? '—'} mph {reading.wind_direction || ''}{reading.wind_gust_mph ? `, gusts ${reading.wind_gust_mph}` : ''}</span></div>
            <div className="flex items-center gap-1.5"><Droplets className="w-4 h-4 text-blue-500" /><span>{reading.humidity_percent ?? '—'}% humidity</span></div>
            {reading.precip_last_hour_in != null && (
              <div className="flex items-center gap-1.5 col-span-2"><CloudRain className="w-4 h-4 text-blue-600" /><span>{reading.precip_last_hour_in}&quot; rain in the past hour</span></div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">NWS station {reading.station_id}{reading.station_name ? ` (${reading.station_name})` : ''}</p>
        </>
      ) : state?.status === 'loading' ? (
        <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Getting the {label} reading…</div>
      ) : state?.status === 'error' ? (
        <div className="text-sm text-red-600 space-y-2">
          <p>{state.message}</p>
          <Button size="sm" variant="outline" onClick={onRetry} className="h-9"><RefreshCw className="w-4 h-4 mr-1" /> Try again</Button>
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">Records automatically after {label}.</p>
      )}
    </div>
  );
}

// Fills in the 7 AM and 2 PM readings once their time has passed. Readings
// already saved on the report are never re-fetched.
// Used by the Daily Report page so weather fills in whichever screen is showing.
export function useReportWeather({ project, date, report, onReading, onCoordinates, disabled }) {
  const [coords, setCoords] = useState(null);
  const [locError, setLocError] = useState(null);
  const [slotState, setSlotState] = useState({});
  const [tick, setTick] = useState(0);
  const inFlight = useRef(new Set());

  // Job-site coordinates: stored on the project, or looked up once from its address.
  useEffect(() => {
    let cancelled = false;
    setCoords(null);
    setLocError(null);
    if (!project) return undefined;
    if (project.latitude != null && project.longitude != null) {
      setCoords({ latitude: project.latitude, longitude: project.longitude });
      return undefined;
    }
    geocodeProject(project).then(found => {
      if (cancelled) return;
      if (found) {
        setCoords(found);
        onCoordinates?.(found);
      } else {
        setLocError('Add the job site address, city, state, or ZIP on the project to get weather.');
      }
    }).catch(() => !cancelled && setLocError('Could not look up the job site location. Check the connection.'));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, project?.latitude, project?.longitude]);

  // Re-check every few minutes so a report left open at 6:55 picks up 7:00.
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), CHECK_EVERY_MS);
    const onOnline = () => setTick(n => n + 1);
    window.addEventListener('online', onOnline);
    return () => { clearInterval(t); window.removeEventListener('online', onOnline); };
  }, []);

  useEffect(() => { setSlotState({}); }, [project?.id, date]);

  useEffect(() => {
    if (!coords || !report || disabled) return;
    for (const slot of ['am', 'pm']) {
      const field = `weather_${slot}`;
      const key = `${report.project_id}:${date}:${slot}`;
      // An error waits for the next check (every few minutes, or back online) before retrying.
      if (report[field] || inFlight.current.has(key) || (slotState[slot]?.status === 'error' && slotState[slot].tick === tick)) continue;
      inFlight.current.add(key);
      setSlotState(s => ({ ...s, [slot]: { status: 'loading' } }));
      fetchSlotReading(coords, date, slot)
        .then(reading => {
          if (reading) onReading(slot, reading);
          setSlotState(s => ({ ...s, [slot]: reading ? { status: 'done' } : { status: 'waiting' } }));
        })
        .catch(err => setSlotState(s => ({
          ...s,
          [slot]: { status: 'error', tick, message: navigator.onLine === false ? 'No signal — will retry when back online.' : err.message },
        })))
        .finally(() => inFlight.current.delete(key));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, date, report?.project_id, report?.weather_am, report?.weather_pm, tick, disabled]);

  const retry = slot => {
    setSlotState(s => ({ ...s, [slot]: undefined }));
    setTick(n => n + 1);
  };

  return { slotState, locError, retry };
}

export default function WeatherCard({ report, onField, disabled, instruction, weather }) {
  const { slotState, locError, retry } = weather;
  const place = report?.weather_am?.location || report?.weather_pm?.location;

  return (
    <Section
      instruction={disabled ? null : instruction}
      icon={CloudSun}
      tone="amber"
      title="Weather"
      subtitle={place ? <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{place}</span> : 'National Weather Service, nearest station to the job site'}
    >
      {locError ? (
        <p className="text-sm text-amber-700 bg-amber-50 rounded-lg p-3">{locError}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Reading slot="am" reading={report?.weather_am} state={slotState.am} onRetry={() => retry('am')} />
          <Reading slot="pm" reading={report?.weather_pm} state={slotState.pm} onRetry={() => retry('pm')} />
        </div>
      )}
      <div className="space-y-1 mt-4">
        <Label htmlFor="site_conditions">Site conditions</Label>
        <Textarea
          id="site_conditions"
          placeholder="Ground conditions, standing water, mud, snow…"
          value={report?.site_conditions || ''}
          onChange={e => onField('site_conditions', e.target.value)}
          disabled={!report || disabled}
          rows={2}
          className="text-base md:text-sm"
        />
      </div>
    </Section>
  );
}
