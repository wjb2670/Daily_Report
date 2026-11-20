import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Pen, Highlighter, Type, Hand, Undo2, Trash2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, CheckCircle2, ExternalLink, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { downloadFile, uploadToFolder, MARKUPS_FOLDER } from '@/field/jobData';
import { currentAccount } from '@/field/auth';

const COLORS = [['Red', '#dc2626'], ['Blue', '#2563eb'], ['Black', '#111827']];
const isPdf = n => /\.pdf$/i.test(n || '');
export const canMarkUp = n => /\.(pdf|png|jpe?g|webp|gif|bmp)$/i.test(n || '');
const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

let pdfjsPromise = null;
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(([lib, worker]) => {
      lib.GlobalWorkerOptions.workerSrc = worker.default;
      return lib;
    });
  }
  return pdfjsPromise;
}

// Draws the marks for one sheet. Marks are kept in sheet units (PDF points, or
// image pixels), so they stay put at any zoom.
function drawMarks(ctx, marks, scale) {
  for (const m of marks) {
    ctx.save();
    if (m.type === 'text') {
      const size = m.size * scale;
      ctx.font = `bold ${size}px Inter, Arial, sans-serif`;
      ctx.textBaseline = 'top';
      const lines = m.text.split('\n');
      const w = Math.max(...lines.map(l => ctx.measureText(l).width));
      const pad = size * 0.3;
      ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.strokeStyle = m.color; ctx.lineWidth = Math.max(1, size * 0.08);
      ctx.fillRect(m.x * scale, m.y * scale, w + pad * 2, lines.length * size * 1.2 + pad * 2);
      ctx.strokeRect(m.x * scale, m.y * scale, w + pad * 2, lines.length * size * 1.2 + pad * 2);
      ctx.fillStyle = m.color;
      lines.forEach((l, i) => ctx.fillText(l, m.x * scale + pad, m.y * scale + pad + i * size * 1.2));
    } else {
      ctx.globalAlpha = m.alpha ?? 1;
      ctx.strokeStyle = m.color; ctx.lineWidth = m.width * scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath();
      m.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale)));
      if (m.pts.length === 1) ctx.lineTo(m.pts[0][0] * scale + 0.01, m.pts[0][1] * scale);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Mark up a drawing from the job's Drawings folder: pen, highlighter and text
// notes. The drawing itself is never changed: the marked-up sheet is saved as a
// new PDF in Drawings › Field Markups, with who, when and a note on it.
export default function MarkupPage() {
  const { projectId, itemId } = useParams();
  const [params] = useSearchParams();
  const [project, setProject] = useState(null);
  const [file, setFile] = useState(null); // { name, bytes }
  const [doc, setDoc] = useState(null); // { kind: 'pdf', pdf, pages } | { kind: 'image', img }
  const [pageNum, setPageNum] = useState(1);
  const [sheet, setSheet] = useState(null); // { w, h } in sheet units for this page
  const [marks, setMarks] = useState({}); // page → marks
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(COLORS[0][1]);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(1);
  const [typing, setTyping] = useState(null); // { x, y, text } in sheet units
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(null);
  const wrap = useRef(null);
  const pageCanvas = useRef(null);
  const inkCanvas = useRef(null);
  const drawing = useRef(null);
  const renderTask = useRef(null);
  const scale = fit * zoom;
  const pageMarks = marks[pageNum] || [];

  useEffect(() => {
    base44.entities.Project.list().then(all => {
      const p = all.find(x => String(x.id) === String(projectId));
      if (!p) throw new Error('You’re not assigned to this job.');
      if (!p.field_folders?.driveId) throw new Error('The office hasn’t opened this job’s folders to the field crew yet.');
      setProject(p);
      setStatus('Downloading the drawing…');
      return downloadFile(p.field_folders.driveId, itemId, pct => setStatus(`Downloading the drawing… ${Math.round(pct * 100)}%`));
    }).then(async f => {
      setFile(f);
      if (isPdf(f.name)) {
        setStatus('Opening the drawing…');
        const lib = await loadPdfjs();
        const pdf = await lib.getDocument({ data: f.bytes, isEvalSupported: false }).promise;
        setDoc({ kind: 'pdf', pdf, pages: pdf.numPages });
        setPageNum(Math.min(Math.max(1, Number(params.get('page')) || 1), pdf.numPages));
      } else {
        const url = URL.createObjectURL(new Blob([f.bytes]));
        const img = new Image();
        await new Promise((ok, fail) => { img.onload = ok; img.onerror = () => fail(new Error('This image can’t be opened.')); img.src = url; });
        setDoc({ kind: 'image', img, pages: 1 });
      }
      setStatus('');
    }).catch(err => { setStatus(''); setError(err.status === 403 || err.status === 404 ? 'You don’t have access to this drawing. Ask the office to update field access for the job.' : err.message); });
  }, [projectId, itemId]); // eslint-disable-line react-hooks/exhaustive-deps

  // The sheet's size, and the zoom that fits it to the screen width.
  useEffect(() => {
    if (!doc) return;
    (async () => {
      const size = doc.kind === 'pdf' ? (await doc.pdf.getPage(pageNum)).getViewport({ scale: 1 }) : { width: doc.img.naturalWidth, height: doc.img.naturalHeight };
      setSheet({ w: size.width, h: size.height });
      setFit(((wrap.current?.clientWidth || 800) - 2) / size.width);
      setZoom(1); setTyping(null);
    })().catch(err => setError(err.message));
  }, [doc, pageNum]);

  // Paint the drawing at the current zoom.
  useLayoutEffect(() => {
    if (!doc || !sheet || !pageCanvas.current) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const c = pageCanvas.current;
    const w = Math.round(sheet.w * scale); const h = Math.round(sheet.h * scale);
    // Very large sheets at high zoom: keep the canvas under ~16M pixels.
    const px = Math.min(dpr, Math.sqrt(16e6 / Math.max(1, w * h)));
    c.width = Math.round(w * px); c.height = Math.round(h * px); c.style.width = `${w}px`; c.style.height = `${h}px`;
    const ink = inkCanvas.current; ink.width = c.width; ink.height = c.height; ink.style.width = `${w}px`; ink.style.height = `${h}px`;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    if (doc.kind === 'image') { ctx.drawImage(doc.img, 0, 0, c.width, c.height); return; }
    let cancelled = false;
    doc.pdf.getPage(pageNum).then(page => {
      if (cancelled) return;
      renderTask.current?.cancel();
      renderTask.current = page.render({ canvasContext: ctx, viewport: page.getViewport({ scale: scale * px }) });
      return renderTask.current.promise.catch(() => {});
    });
    return () => { cancelled = true; };
  }, [doc, sheet, scale, pageNum]);

  const paintInk = useCallback(() => {
    const ink = inkCanvas.current; if (!ink || !sheet) return;
    const ctx = ink.getContext('2d'); ctx.clearRect(0, 0, ink.width, ink.height);
    drawMarks(ctx, [...pageMarks, ...(drawing.current ? [drawing.current] : [])], ink.width / sheet.w);
  }, [pageMarks, sheet]);
  useLayoutEffect(paintInk, [paintInk, scale]);

  const at = e => { const r = inkCanvas.current.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; };
  const addMark = m => { setSaved(null); setMarks(all => ({ ...all, [pageNum]: [...(all[pageNum] || []), m] })); };
  const down = e => {
    if (tool === 'move') return;
    e.preventDefault();
    const p = at(e);
    if (tool === 'text') { setTyping({ x: p[0], y: p[1], text: '' }); return; }
    inkCanvas.current.setPointerCapture?.(e.pointerId);
    drawing.current = tool === 'highlight'
      ? { type: 'path', color: '#facc15', alpha: 0.4, width: 16 / scale, pts: [p] }
      : { type: 'path', color, width: 3 / scale, pts: [p] };
    paintInk();
  };
  const move = e => { if (!drawing.current) return; e.preventDefault(); drawing.current.pts.push(at(e)); paintInk(); };
  const up = () => { if (!drawing.current) return; const m = drawing.current; drawing.current = null; addMark(m); };
  const placeText = () => { if (typing?.text.trim()) addMark({ type: 'text', x: typing.x, y: typing.y, text: typing.text.trim(), color, size: 16 / scale }); setTyping(null); };

  const allMarks = Object.values(marks).reduce((n, m) => n + m.length, 0);
  const save = async () => {
    setError(''); setSaved(null);
    const markupsId = project.field_folders.folders?.Drawings?.markups?.id;
    if (!markupsId) { setError(`There’s no ${MARKUPS_FOLDER} folder for this job yet. Ask the office to update field access for the job (Project Startup › Field crew access).`); return; }
    try {
      setStatus('Saving the marked-up sheet…');
      const { jsPDF } = await import('jspdf');
      const me = currentAccount() || {};
      const who = me.name || me.email || 'Field';
      const now = new Date();
      const pages = doc.kind === 'pdf' ? Object.keys(marks).map(Number).filter(n => marks[n].length).sort((a, b) => a - b) : [1];
      let pdf = null;
      for (const n of pages) {
        const size = doc.kind === 'pdf' ? (await doc.pdf.getPage(n)).getViewport({ scale: 1 }) : { width: sheet.w, height: sheet.h };
        const s = Math.min(doc.kind === 'pdf' ? 2 : 1, 4200 / Math.max(size.width, size.height));
        const c = document.createElement('canvas'); c.width = Math.round(size.width * s); c.height = Math.round(size.height * s);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        if (doc.kind === 'pdf') { const page = await doc.pdf.getPage(n); await page.render({ canvasContext: ctx, viewport: page.getViewport({ scale: s }) }).promise; }
        else ctx.drawImage(doc.img, 0, 0, c.width, c.height);
        drawMarks(ctx, marks[n] || [], s);
        // Page in points: the sheet's own size, plus a band for who/when/note.
        const pw = doc.kind === 'pdf' ? size.width : 792; const ph = pw * (c.height / c.width);
        const band = Math.max(36, pw * 0.03);
        const dims = [pw, ph + band];
        if (!pdf) pdf = new jsPDF({ unit: 'pt', format: dims, orientation: pw > ph + band ? 'landscape' : 'portrait' });
        else pdf.addPage(dims, pw > ph + band ? 'landscape' : 'portrait');
        pdf.addImage(c.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, pw, ph);
        const fs = Math.max(8, band * 0.28);
        pdf.setFillColor(15, 42, 94); pdf.rect(0, ph, pw, band, 'F');
        pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(fs);
        pdf.text(`FIELD MARKUP · ${file.name}${doc.pages > 1 ? ` · page ${n} of ${doc.pages}` : ''} · ${who} · ${now.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}`, fs, ph + fs * 1.4);
        pdf.setFont('helvetica', 'normal');
        pdf.text(pdf.splitTextToSize(note.trim() ? `Note: ${note.trim()}` : 'Not the current drawing set: a mark-up from the field.', pw - fs * 2)[0], fs, ph + fs * 2.8);
      }
      const base = file.name.replace(/\.[^.]+$/, '');
      const pagePart = doc.kind === 'pdf' && doc.pages > 1 ? ` p${pages.join(',')}` : '';
      const name = `${base}${pagePart} markup ${ymd(now)} ${who}.pdf`;
      const blob = pdf.output('blob');
      const item = await uploadToFolder(project.field_folders.driveId, markupsId, new File([blob], name, { type: 'application/pdf' }), pct => setStatus(`Saving the marked-up sheet… ${Math.round(pct * 100)}%`));
      setSaved({ name: item?.name || name, webUrl: item?.webUrl });
      setStatus('');
    } catch (err) {
      setStatus('');
      setError(err.status === 403 ? `You can’t save to ${MARKUPS_FOLDER} yet. Ask the office to update field access for the job.` : navigator.onLine === false ? 'No signal. Keep this screen open and tap Save again when you have signal.' : err.message);
    }
  };

  const back = <Link to={`/docs/${projectId}`} className="inline-flex items-center gap-1.5 text-[#1e3a8a] font-semibold py-2"><ArrowLeft className="w-5 h-5" /> Job documents</Link>;
  if (error && !doc) return <div className="max-w-3xl mx-auto">{back}<p className="text-red-700 bg-red-50 border border-red-200 rounded-lg p-4 mt-3">{error}</p></div>;
  if (!doc) return <div className="max-w-3xl mx-auto">{back}<div className="flex items-center justify-center gap-2 text-gray-500 py-16"><Loader2 className="w-5 h-5 animate-spin" /> {status || 'Loading…'}</div></div>;

  const tb = on => `h-11 min-w-11 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold ${on ? 'bg-[#0f2a5e] text-white border-[#0f2a5e]' : 'bg-white text-[#0f2a5e] border-gray-300'}`;
  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">{back}<h1 className="font-bold text-[#0f2a5e] text-lg truncate flex-1 min-w-0" title={file.name}>{file.name}</h1></div>

      <div className="sticky top-0 z-20 bg-[#f1f5f9]/95 backdrop-blur py-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label="Markup tools">
        <button type="button" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')} className={tb(tool === 'pen')}><Pen className="w-4 h-4" /> Pen</button>
        <button type="button" aria-pressed={tool === 'highlight'} onClick={() => setTool('highlight')} className={tb(tool === 'highlight')}><Highlighter className="w-4 h-4" /> Highlight</button>
        <button type="button" aria-pressed={tool === 'text'} onClick={() => setTool('text')} className={tb(tool === 'text')}><Type className="w-4 h-4" /> Note</button>
        <button type="button" aria-pressed={tool === 'move'} onClick={() => setTool('move')} className={tb(tool === 'move')}><Hand className="w-4 h-4" /> Move</button>
        <span className="flex gap-1" role="group" aria-label="Color">
          {COLORS.map(([n, c]) => <button key={c} type="button" aria-label={n} aria-pressed={color === c} onClick={() => setColor(c)} className={`w-11 h-11 rounded-lg border-2 ${color === c ? 'border-[#0f2a5e]' : 'border-transparent'}`}><span className="block w-6 h-6 rounded-full mx-auto" style={{ background: c }} /></button>)}
        </span>
        <span className="flex gap-1">
          <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, z / 1.5))} className={tb(false)}><ZoomOut className="w-4 h-4" /></button>
          <button type="button" aria-label="Zoom in" disabled={zoom >= 8} onClick={() => setZoom(z => Math.min(8, z * 1.5))} className={tb(false)}><ZoomIn className="w-4 h-4" /></button>
        </span>
        <button type="button" aria-label="Undo" disabled={!pageMarks.length} onClick={() => setMarks(all => ({ ...all, [pageNum]: (all[pageNum] || []).slice(0, -1) }))} className={`${tb(false)} disabled:opacity-40`}><Undo2 className="w-4 h-4" /> Undo</button>
        <button type="button" aria-label="Clear this sheet" disabled={!pageMarks.length} onClick={() => setMarks(all => ({ ...all, [pageNum]: [] }))} className={`${tb(false)} disabled:opacity-40`}><Trash2 className="w-4 h-4" /></button>
        {doc.pages > 1 && (
          <span className="flex items-center gap-1 ml-auto">
            <button type="button" aria-label="Previous page" disabled={pageNum <= 1} onClick={() => setPageNum(n => n - 1)} className={`${tb(false)} disabled:opacity-40`}><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-gray-700 px-1">Page {pageNum} of {doc.pages}</span>
            <button type="button" aria-label="Next page" disabled={pageNum >= doc.pages} onClick={() => setPageNum(n => n + 1)} className={`${tb(false)} disabled:opacity-40`}><ChevronRight className="w-4 h-4" /></button>
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-2">{tool === 'move' ? 'Drag to move around the sheet. Pick Pen, Highlight or Note to mark it up.' : tool === 'text' ? 'Tap where the note goes, type it, then tap Add.' : 'Draw with your finger or a pencil. Use Move to scroll a zoomed-in sheet.'} The drawing itself is never changed.</p>

      <div ref={wrap} className="relative bg-gray-300 rounded-lg border border-gray-300 overflow-auto max-h-[75vh]" style={{ touchAction: tool === 'move' ? 'auto' : 'none' }}>
        <div className="relative" style={{ width: sheet ? sheet.w * scale : 0, height: sheet ? sheet.h * scale : 0 }}>
          <canvas ref={pageCanvas} className="absolute inset-0 bg-white" aria-label={`Drawing page ${pageNum}`} />
          <canvas ref={inkCanvas} className="absolute inset-0" data-testid="ink" style={{ pointerEvents: tool === 'move' ? 'none' : 'auto', cursor: tool === 'text' ? 'text' : 'crosshair', touchAction: tool === 'move' ? 'auto' : 'none' }}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
          {typing && (
            <div className="absolute z-10 bg-white rounded-lg shadow-lg border border-gray-300 p-2 w-64" style={{ left: Math.min(typing.x * scale, Math.max(0, sheet.w * scale - 260)), top: typing.y * scale }}>
              <textarea autoFocus aria-label="Note text" rows={3} value={typing.text} onChange={e => setTyping(t => ({ ...t, text: e.target.value }))} className="w-full rounded border border-gray-300 p-2 text-base" placeholder="e.g. Outlet moved 2 ft left per owner" />
              <div className="flex justify-end gap-2 mt-1">
                <button type="button" onClick={() => setTyping(null)} className="h-9 px-3 rounded-md text-sm font-semibold text-gray-600">Cancel</button>
                <button type="button" onClick={placeText} disabled={!typing.text.trim()} className="h-9 px-3 rounded-md bg-[#0f2a5e] text-white text-sm font-semibold disabled:opacity-40">Add</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-4 mt-4 space-y-3">
        <label htmlFor="mk-note" className="block text-sm font-semibold text-gray-700">What is this mark-up about? <span className="font-normal text-gray-400">(optional, printed on the sheet)</span></label>
        <textarea id="mk-note" rows={2} value={note} onChange={e => { setNote(e.target.value); setSaved(null); }} className="w-full rounded-md border border-gray-300 px-3 py-2 text-base md:text-sm" placeholder="e.g. As-built: sleeve location at grid C-4" />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={!allMarks || !!status} className="h-12 px-5 rounded-lg bg-[#0f2a5e] text-white font-semibold inline-flex items-center gap-2 disabled:opacity-40">{status ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save to {MARKUPS_FOLDER}</button>
          <span className="text-sm text-gray-500">{status || (allMarks ? `${allMarks} mark${allMarks === 1 ? '' : 's'}${doc.pages > 1 ? ` on ${Object.values(marks).filter(m => m.length).length} page(s)` : ''}` : 'Draw or add a note to save.')}</span>
        </div>
        {saved && <p className="text-sm text-green-800 flex flex-wrap items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Saved to Drawings › {MARKUPS_FOLDER} as “{saved.name}”.{saved.webUrl && <a href={saved.webUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#1e3a8a] underline">Open it <ExternalLink className="w-3.5 h-3.5" /></a>}</p>}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </section>
    </div>
  );
}
