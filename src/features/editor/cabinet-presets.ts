import type { CabinetPresetId, CabinetSettings } from "@/features/editor/types";

export type CabinetPreset = {
  id: CabinetPresetId;
  label: string;
  pixelWidth: number;
  pixelHeight: number;
  modulePixelWidth: number;
  modulePixelHeight: number;
  note: string;
  physicalWidthMm: number;
  physicalHeightMm: number;
  pixelPitchMm: number;
};

export const cabinetPresets: CabinetPreset[] = [
  {
    id: "p625-500",
    label: "P6.25 / 80x80",
    pixelWidth: 80,
    pixelHeight: 80,
    modulePixelWidth: 40,
    modulePixelHeight: 40,
    physicalWidthMm: 500,
    physicalHeightMm: 500,
    pixelPitchMm: 6.25,
    note: "500mm cabinet at 6.25mm pitch; verify against the exact manufacturer module."
  },
  {
    id: "p391-500",
    label: "P3.91 / 128x128",
    pixelWidth: 128,
    pixelHeight: 128,
    modulePixelWidth: 64,
    modulePixelHeight: 64,
    physicalWidthMm: 500,
    physicalHeightMm: 500,
    pixelPitchMm: 3.91,
    note: "Common rental cabinet from 4x 250mm modules."
  },
  {
    id: "p260-500",
    label: "P2.6 / 192x192",
    pixelWidth: 192,
    pixelHeight: 192,
    modulePixelWidth: 96,
    modulePixelHeight: 96,
    physicalWidthMm: 500,
    physicalHeightMm: 500,
    pixelPitchMm: 2.604,
    note: "Fine-pitch 500mm cabinet."
  },
  {
    id: "p2976-500",
    label: "P2.976 / 168x168",
    pixelWidth: 168,
    pixelHeight: 168,
    modulePixelWidth: 84,
    modulePixelHeight: 84,
    physicalWidthMm: 500,
    physicalHeightMm: 500,
    pixelPitchMm: 2.976,
    note: "Frequent rental panel resolution."
  },
  {
    id: "p481-500",
    label: "P4.81 / 104x104",
    pixelWidth: 104,
    pixelHeight: 104,
    modulePixelWidth: 52,
    modulePixelHeight: 52,
    physicalWidthMm: 500,
    physicalHeightMm: 500,
    pixelPitchMm: 4.81,
    note: "Common coarse rental pitch; 250mm module is usually 52x52."
  },
  {
    id: "p195-500",
    label: "P1.95 / 256x256",
    pixelWidth: 256,
    pixelHeight: 256,
    modulePixelWidth: 128,
    modulePixelHeight: 128,
    physicalWidthMm: 500,
    physicalHeightMm: 500,
    pixelPitchMm: 1.953,
    note: "Fine-pitch 500mm cabinet approximation from 1.95mm pitch."
  },
  {
    id: "strip-512x256",
    label: "Strip / 512x256",
    pixelWidth: 512,
    pixelHeight: 256,
    modulePixelWidth: 128,
    modulePixelHeight: 128,
    physicalWidthMm: 512,
    physicalHeightMm: 256,
    pixelPitchMm: 1,
    note: "Useful for horizontal LED strip blocks."
  }
];

export const defaultCabinetSettings: CabinetSettings = {
  presetId: "p391-500",
  pixelWidth: 128,
  pixelHeight: 128,
  modulePixelWidth: 64,
  modulePixelHeight: 64,
  showCabinetGrid: true,
  showModuleGrid: false,
  showPixelDots: true
  ,physicalWidthMm: 500
  ,physicalHeightMm: 500
  ,pixelPitchMm: 3.91
  ,manualOverride: false
  ,cabinetColumns: 1
  ,cabinetRows: 1
  ,cabinetLineThickness: 2
  ,cabinetLineOpacity: 0.62
  ,showCabinetNumbers: false
  ,cabinetStartNumber: 1
  ,scanDirection: "left-to-right"
};

export function cabinetSettingsFromPreset(id: CabinetPresetId): CabinetSettings {
  const preset = cabinetPresets.find((item) => item.id === id);

  if (!preset) {
    return { ...defaultCabinetSettings, presetId: "custom" };
  }

  return {
    presetId: preset.id,
    pixelWidth: preset.pixelWidth,
    pixelHeight: preset.pixelHeight,
    modulePixelWidth: preset.modulePixelWidth,
    modulePixelHeight: preset.modulePixelHeight,
    physicalWidthMm: preset.physicalWidthMm,
    physicalHeightMm: preset.physicalHeightMm,
    pixelPitchMm: preset.pixelPitchMm,
    manualOverride: false,
    cabinetColumns: 1,
    cabinetRows: 1,
    cabinetLineThickness: 2,
    cabinetLineOpacity: 0.62,
    showCabinetNumbers: false,
    cabinetStartNumber: 1,
    scanDirection: "left-to-right",
    showCabinetGrid: true,
    showModuleGrid: false,
    showPixelDots: true
  };
}
