"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NumericField } from "./numeric-field";
import { defaultScreenPattern, type EditorScreen, type ScreenPatternSettings } from "@/features/editor/types";
import { useEditorStore } from "@/stores/editor-store";
import { loadEditorImage } from "@/features/editor/image-assets";

export function CenterLogoControls({ screen }: { screen: EditorScreen }) {
  const [status, setStatus] = useState("");
  const uploadSequence = useRef(0);
  useEffect(() => () => { uploadSequence.current++; }, []);
  const p = { ...defaultScreenPattern, ...screen.pattern };
  const update = (patch: Partial<ScreenPatternSettings>) => {
    const store = useEditorStore.getState();
    const current = store.screens.find(s => s.id === screen.id);
    if (!current) return;
    store.beginTransform();
    store.updateScreen(screen.id, { pattern: { ...defaultScreenPattern, ...current.pattern, ...patch } });
    store.commitTransform();
  };

  function previewSize(percent: number) {
    const store = useEditorStore.getState();
    const current = store.screens.find(s => s.id === screen.id);
    if (!current) return;
    store.beginTransform();
    store.updateScreen(screen.id, { pattern: { ...defaultScreenPattern, ...current.pattern, logoScale: Math.max(25, Math.min(200, percent)) / 100 } });
  }

  async function upload(file: File) {
    const sequence = ++uploadSequence.current;
    const pageId = useEditorStore.getState().pageId;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5_000_000) { setStatus("Pilih PNG, JPG, atau WebP maksimum 5 MB."); return; }
    const url = URL.createObjectURL(file);
    const isCurrent = () => sequence === uploadSequence.current && useEditorStore.getState().pageId === pageId;
    setStatus(`Memuat ${file.name}…`);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const ratio = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
      const output = document.createElement("canvas");
      output.width = Math.max(1, Math.round(image.naturalWidth * ratio)); output.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      output.getContext("2d")!.drawImage(image, 0, 0, output.width, output.height);
      if (!isCurrent()) return;
      const dataUrl = output.toDataURL("image/png");
      await loadEditorImage(dataUrl);
      if (!isCurrent()) return;
      update({ logoDataUrl: dataUrl, logoTemplate: "upload", centerMode: "logo" });
      const visible = useEditorStore.getState().screens.find(s => s.id === screen.id)?.pattern.showScreenIndex;
      setStatus(`${file.name} siap.${visible ? "" : " Aktifkan Show Number / Logo untuk menampilkannya."}`);
    } catch { if (isCurrent()) setStatus("Logo tidak dapat dibaca. Coba file gambar lain."); }
    finally { URL.revokeObjectURL(url); }
  }

  return <div className="space-y-3 border border-pf-border bg-black/20 p-3">
    <p className="font-mono text-xs uppercase text-pf-red">Center • Screen / Logo</p>
    <Button
      type="button"
      role="switch"
      aria-label="Show Number / Logo"
      aria-checked={p.showScreenIndex}
      className="w-full justify-between"
      onClick={() => update({ showScreenIndex: !p.showScreenIndex })}
    >
      <span>Show Number / Logo</span>
      <span className={p.showScreenIndex ? "text-pf-red" : "text-pf-muted"}>{p.showScreenIndex ? "ON" : "OFF"}</span>
    </Button>
    <p className="text-xs leading-5 text-pf-muted">ON menampilkan angka atau logo tengah. OFF menyembunyikannya. Nama screen diatur lewat Name; untuk menyembunyikan resolusi, matikan Res dan Size.</p>
    <label className="block space-y-1"><span className="technical-label">Center Mode</span>
      <select className="technical-input" value={p.centerMode} onChange={e => update({ centerMode: e.target.value as ScreenPatternSettings["centerMode"], ...(e.target.value === "screen" ? { badgeText: String(screen.zIndex + 1) } : {}) })}>
        <option value="screen">Screen number</option><option value="logo">Logo</option>
      </select>
    </label>
    {p.centerMode === "logo" && <>
      <div className="space-y-2">
        <NumericField label="Logo Size %" value={Math.round(p.logoScale * 100)} min={25} max={200} integer onPreview={previewSize} onCommit={() => useEditorStore.getState().commitTransform()} />
        <input aria-label="Logo Size" className="w-full accent-pf-red" type="range" min={25} max={200} step={1} value={Math.round(p.logoScale * 100)} onChange={e => previewSize(Number(e.target.value))} onPointerUp={() => useEditorStore.getState().commitTransform()} onPointerCancel={() => useEditorStore.getState().commitTransform()} onKeyUp={() => useEditorStore.getState().commitTransform()} onBlur={() => useEditorStore.getState().commitTransform()} />
        <p className="text-xs text-pf-muted">25–200%. 100% adalah ukuran default; rasio logo tetap.</p>
      </div>
      <label className="block space-y-1"><span className="technical-label">Logo Template</span>
        <select className="technical-input" value={p.logoTemplate} onChange={e => update({ logoTemplate: e.target.value as ScreenPatternSettings["logoTemplate"] })}>
          <option value="monogram">VJM Monogram</option><option value="diamond">Diamond Emblem</option><option value="orbit">Orbit Emblem</option><option value="upload">Uploaded logo</option>
        </select>
      </label>
      {p.logoTemplate === "upload" ? <label className="block space-y-1"><span className="technical-label">Upload Center Logo</span><input aria-label="Upload Center Logo" className="w-full text-xs" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(file); }} />{!p.logoDataUrl && <span className="text-xs text-pf-muted">Upload logo untuk menggantikan placeholder VJM.</span>}</label> : <label className="block space-y-1"><span className="technical-label">Logo Text</span><input className="technical-input" maxLength={12} value={p.logoText} onChange={e => update({ logoText: e.target.value })} /></label>}
      <label className="block space-y-1"><span className="technical-label">Logo Color</span><input className="h-9 w-full" type="color" value={p.logoColor} onChange={e => update({ logoColor: e.target.value })} /></label>
      <div className="grid grid-cols-2 gap-2 text-xs text-pf-muted">
        {[["Extrude / 3D look", "logoExtrude"], ["Shining", "logoShine"], ["Rotate", "logoRotate"]].map(([label, key]) => <label className="flex items-center gap-2" key={key}><input type="checkbox" checked={Boolean(p[key as keyof ScreenPatternSettings])} onChange={e => update({ [key]: e.target.checked })} />{label}</label>)}
      </div>
      {p.logoExtrude && <NumericField label="Extrude Depth %" value={p.logoDepth * 100} min={0} max={30} onPreview={value => update({ logoDepth: Math.max(0, Math.min(30, value)) / 100 })} onCommit={() => {}} />}
      <NumericField label="Logo Speed" value={p.logoSpeed} min={0.05} max={2} step={0.05} onPreview={value => update({ logoSpeed: Math.max(0.05, Math.min(2, value)) })} onCommit={() => {}} />
      <Button className="w-full" onClick={() => { const store = useEditorStore.getState(); if (!store.previewPlaying) store.togglePreview(); }}>PREVIEW LOGO MOTION</Button>
      <p className="text-xs leading-5 text-pf-muted">Logo berada di depan overlay; nama screen tetap kecil di bawah. Extrude memakai tampilan kedalaman 2.5D. Kilau dan rotasi mengikuti Logo Speed.</p>
      <Button className="w-full" onClick={() => {
        const store = useEditorStore.getState(); store.beginTransform();
        store.screens.filter(s => s.type !== "logo").forEach(s => store.updateScreen(s.id, { pattern: { ...defaultScreenPattern, ...s.pattern, centerMode: "logo", showScreenIndex: p.showScreenIndex, logoTemplate: p.logoTemplate, logoDataUrl: p.logoDataUrl, logoText: p.logoText, logoColor: p.logoColor, logoExtrude: p.logoExtrude, logoDepth: p.logoDepth, logoShine: p.logoShine, logoRotate: p.logoRotate, logoSpeed: p.logoSpeed, logoScale: p.logoScale } }));
        store.commitTransform();
      }}>APPLY LOGO TO ALL</Button>
    </>}
    {status && <p role="status" className="text-xs leading-5 text-pf-muted">{status}</p>}
  </div>;
}
