import React, { useEffect, useState } from 'react';
import { X, Share, MoreVertical, PlusSquare } from 'lucide-react';

// A reminder to put the app on the Home Screen. Shows only on phones and
// tablets when the app was opened in a browser instead of from its icon.
// "Not now" hides it for two weeks.

const KEY = 'fieldReports:installHintHiddenUntil';
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;

function detect() {
  const ua = navigator.userAgent || '';
  const standalone = window.navigator.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches;
  if (standalone) return null;
  // iPads report themselves as Macs; a touch screen gives them away.
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  if (!ios && !android) return null;
  if (ios) {
    // Only Safari can add to the Home Screen properly. Chrome/Edge on iOS
    // and the pop-up browsers inside Outlook, Teams etc. can't.
    const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    const inApp = /FBAN|FBAV|Instagram|Line\/|GSA\//.test(ua) || !/Safari/.test(ua);
    return { platform: 'ios', inSafari: !otherBrowser && !inApp, device: /iPad/.test(ua) || /Macintosh/.test(ua) ? 'iPad' : 'iPhone' };
  }
  return { platform: 'android' };
}

function hiddenNow() {
  try { return Number(localStorage.getItem(KEY) || 0) > Date.now(); } catch { return false; }
}

export default function InstallHint({ className = '' }) {
  const [info] = useState(detect);
  const [hidden, setHidden] = useState(hiddenNow);
  const [prompt, setPrompt] = useState(null);

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setPrompt(e); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!info || hidden) return null;

  const notNow = () => {
    try { localStorage.setItem(KEY, String(Date.now() + TWO_WEEKS)); } catch { /* ignore */ }
    setHidden(true);
  };

  const step = (n, children) => (
    <li className="flex items-start gap-2.5">
      <span className="shrink-0 w-6 h-6 rounded-full bg-white text-[#0f2a5e] text-sm font-bold flex items-center justify-center">{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  );

  return (
    <div role="region" aria-label="Add to Home Screen" className={`relative bg-[#1e3a8a] text-white rounded-xl p-4 pr-10 shadow-md text-left ${className}`}>
      <button type="button" onClick={notNow} aria-label="Hide this reminder" className="absolute top-2 right-2 p-2 text-blue-100 hover:text-white">
        <X className="w-5 h-5" />
      </button>
      <h2 className="font-bold text-lg leading-tight">Put Field Reports on your Home Screen</h2>
      <p className="text-blue-100 text-sm mt-1 mb-3">It opens full screen like a regular app, and you won’t need this link again.</p>

      {info.platform === 'ios' && !info.inSafari && (
        <ol className="space-y-2 text-sm">
          {step(1, <>This page isn’t open in Safari. Tap the <strong>Safari</strong> or <strong>Open in browser</strong> button, or open <strong>Safari</strong> and go to <strong className="whitespace-nowrap">wjb2670.github.io/Daily_Report</strong></>)}
          {step(2, <>In Safari, tap <Share className="inline w-4 h-4 -mt-0.5" aria-label="Share" /> <strong>Share</strong>, then <PlusSquare className="inline w-4 h-4 -mt-0.5" aria-hidden="true" /> <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</>)}
        </ol>
      )}

      {info.platform === 'ios' && info.inSafari && (
        <ol className="space-y-2 text-sm">
          {step(1, <>Tap <Share className="inline w-4 h-4 -mt-0.5" aria-label="Share" /> <strong>Share</strong> {info.device === 'iPad' ? 'at the top of the screen' : 'at the bottom of the screen'}.</>)}
          {step(2, <>Scroll down and tap <PlusSquare className="inline w-4 h-4 -mt-0.5" aria-hidden="true" /> <strong>Add to Home Screen</strong>.</>)}
          {step(3, <>Tap <strong>Add</strong>. Then open Field Reports from the new icon.</>)}
        </ol>
      )}

      {info.platform === 'android' && (prompt ? (
        <button type="button" onClick={async () => { prompt.prompt(); await prompt.userChoice.catch(() => null); setPrompt(null); setHidden(true); }}
          className="h-11 px-5 rounded-md bg-white text-[#0f2a5e] font-bold">
          Add to Home Screen
        </button>
      ) : (
        <ol className="space-y-2 text-sm">
          {step(1, <>In Chrome, tap the <MoreVertical className="inline w-4 h-4 -mt-0.5" aria-label="menu" /> menu at the top right.</>)}
          {step(2, <>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>), then <strong>Add</strong>.</>)}
        </ol>
      ))}

      <button type="button" onClick={notNow} className="mt-3 text-sm text-blue-100 underline">Not now</button>
    </div>
  );
}
