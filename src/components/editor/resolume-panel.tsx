"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { exportResolumeXml, parseResolumeXml } from "@/features/editor/resolume";
import { useEditorStore } from "@/stores/editor-store";

type ReadHandle = { name: string; getFile: () => Promise<File> };
type PickerWindow = Window & { showOpenFilePicker?: (options: unknown) => Promise<ReadHandle[]> };

export function ResolumePanel() {
  const pageId = useEditorStore(s => s.pageId);
  const input = useRef<HTMLInputElement>(null);
  const linked = useRef<ReadHandle | null>(null);
  const lastText = useRef("");
  const generation = useRef(0);
  const reading = useRef(false);
  const [isLinked, setIsLinked] = useState(false);
  const [resize, setResize] = useState(true);
  const [status, setStatus] = useState("Impor preset Advanced Output untuk membaca slice.");
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    generation.current++;
    linked.current = null;
    lastText.current = "";
    // The component is keyed by page in the sidebar; also invalidate pending reads.
    const currentGeneration = generation;
    return () => { currentGeneration.current++; linked.current = null; };
  }, [pageId]);

  const read = useCallback(async (file: File, token: number) => {
    if (file.size > 10_000_000) throw new Error("Maksimum file XML 10 MB.");
    const text = await file.text();
    if (token !== generation.current || text === lastText.current) return;
    const store = useEditorStore.getState();
    const imported = parseResolumeXml(text, file.name, store.canvas);
    store.syncResolume(imported, resize);
    lastText.current = text;
    setWarnings(imported.warnings);
    setStatus(`${imported.screens.length} slice • ${file.name} • ${new Date().toLocaleTimeString()}`);
  }, [resize]);

  useEffect(() => {
    if (!isLinked) return;
    let active = true;
    const timer = window.setInterval(async () => {
      if (!linked.current || reading.current || !active) return;
      reading.current = true;
      const token = generation.current;
      try {
        const file = await linked.current.getFile();
        if (active) await read(file, token);
      } catch (error) {
        if (active) { setStatus(`Link terhenti: ${error instanceof Error ? error.message : "File tidak dapat dibaca"}. Pilih Link XML lagi.`); linked.current = null; setIsLinked(false); }
      } finally { reading.current = false; }
    }, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isLinked, read, pageId]);

  async function openLink() {
    const picker = (window as PickerWindow).showOpenFilePicker;
    if (!picker) { setStatus("Browser ini belum mendukung link file. Gunakan Import XML setelah Save & Close di Resolume."); input.current?.click(); return; }
    const requestGeneration = generation.current;
    try {
      const [handle] = await picker.call(window, { multiple: false, types: [{ description: "Resolume Advanced Output", accept: { "application/xml": [".xml"] } }] });
      if (!handle || requestGeneration !== generation.current) return;
      generation.current++;
      linked.current = null;
      setIsLinked(false);
      lastText.current = "";
      const token = generation.current;
      await read(await handle.getFile(), token);
      if (token !== generation.current) return;
      linked.current = handle; setIsLinked(true);
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setStatus(error instanceof Error ? error.message : "Gagal membuka file."); }
  }

  function exportLayout() {
    try {
      const { canvas, screens } = useEditorStore.getState();
      const xml = exportResolumeXml(canvas, screens);
      const url = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
      const a = document.createElement("a"); a.href = url; a.download = "PixelMapVJM-AdvancedOutput.xml"; a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("Layout virtual diekspor. Load preset ini di Advanced Output Resolume.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Ekspor gagal."); }
  }

  return <div className="space-y-3">
    <p className="text-xs leading-5 text-pf-muted">Resolume → Advanced Output → Save & Close → Reveal in Finder/Explorer. Pilih XML tersebut; koordinat mengikuti Input Selection.</p>
    <input ref={input} type="file" accept=".xml,application/xml,text/xml" className="hidden" aria-label="Import Resolume XML" onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      generation.current++; linked.current = null; setIsLinked(false); lastText.current = "";
      try { await read(file, generation.current); } catch (error) { setStatus(error instanceof Error ? error.message : "Impor gagal."); }
    }} />
    <div className="grid grid-cols-2 gap-2">
      <Button onClick={() => input.current?.click()}>IMPORT XML</Button>
      <Button onClick={() => void openLink()}>LINK XML</Button>
    </div>
    <label className="flex gap-2 text-xs text-pf-muted"><input type="checkbox" checked={resize} onChange={e => setResize(e.target.checked)} />Ikuti ukuran composition saat impor/sync</label>
    {isLinked && <Button className="w-full" onClick={() => { generation.current++; linked.current = null; setIsLinked(false); setStatus("Link dihentikan. Slice tetap tersimpan."); }}>STOP AUTO SYNC</Button>}
    <p role="status" className="break-words border border-pf-border p-2 text-xs leading-5 text-pf-muted">{isLinked ? "AUTO SYNC 2s • " : ""}{status}</p>
    {warnings.length > 0 && <details className="text-xs leading-5 text-pf-muted"><summary>Catatan impor ({warnings.length})</summary><ul className="mt-2 list-inside list-disc">{warnings.map(w => <li key={w}>{w}</li>)}</ul></details>}
    <Button className="w-full" onClick={exportLayout}>EXPORT NEW LAYOUT XML</Button>
    <p className="text-xs leading-5 text-pf-muted">Ekspor membuat satu output virtual baru dengan posisi input = output; tidak membawa routing, warp, atau blending dari preset lama. PNG/MP4 dapat dipakai pada composition dan slice asli.</p>
  </div>;
}
