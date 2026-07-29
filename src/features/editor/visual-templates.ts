import type { ScreenAnimationSettings, ScreenPatternSettings } from "@/features/editor/types";

export type VisualTemplate = {
  id: string;
  label: string;
  fillColor: string;
  borderColor: string;
  pattern: Partial<ScreenPatternSettings>;
  animation: Partial<ScreenAnimationSettings>;
};

export const visualTemplates: VisualTemplate[] = [
  {
    id: "green-calibration",
    label: "Clean Green Calibration / Export",
    fillColor: "#020806",
    borderColor: "#FF3030",
    pattern: {
      type: "mapper-calibration",
      mode: "global",
      backgroundColor: "#020806",
      primaryColor: "#FF3030",
      secondaryColor: "#20F26D",
      gridColor: "#D9FFE7",
      cabinetGridColor: "#FF3030",
      moduleGridColor: "#43F58A",
      pixelDotColor: "#E9FFF1",
      labelBackgroundColor: "#050505",
      labelTextColor: "#F4F4F4",
      gridSize: 64,
      lineWidth: 2,
      lineThickness: 3,
      circleCount: 5,
      labelBackgroundOpacity: 0.94,
      showCircle: true,
      showDiagonal: true,
      showCenterCrosshair: true,
      showScreenName: true,
      showResolution: true,
      showCabinetInfo: true
    },
    animation: { type: "gradient-wipe", primaryColor: "#20F26D", secondaryColor: "#FF3030", speed: 1.1, direction: "left-to-right" }
  },
  {
    id: "red-inspection",
    label: "Red Inspection / High Contrast",
    fillColor: "#160707",
    borderColor: "#FF3030",
    pattern: {
      type: "calibration",
      mode: "local",
      backgroundColor: "#050505",
      primaryColor: "#FF3030",
      secondaryColor: "#F4F4F4",
      gridColor: "#FF3030",
      cabinetGridColor: "#FF3030",
      moduleGridColor: "#F4F4F4",
      pixelDotColor: "#F4F4F4",
      labelBackgroundColor: "#080808",
      labelTextColor: "#F4F4F4",
      gridSize: 64,
      lineWidth: 1,
      lineThickness: 2,
      circleCount: 4,
      labelBackgroundOpacity: 0.92,
      showCircle: true,
      showDiagonal: true,
      showCenterCrosshair: true,
      showScreenName: true,
      showResolution: true,
      showCabinetInfo: true
    },
    animation: { type: "scanner", primaryColor: "#FF3030", secondaryColor: "#F4F4F4", speed: 0.85, direction: "left-to-right" }
  },
  {
    id: "blue-cabinet-check",
    label: "Blue Cabinet / Service Check",
    fillColor: "#070d1a",
    borderColor: "#2B68FF",
    pattern: {
      type: "grid",
      mode: "global",
      backgroundColor: "#05070d",
      primaryColor: "#2B68FF",
      secondaryColor: "#32D583",
      gridColor: "#2B68FF",
      cabinetGridColor: "#2B68FF",
      moduleGridColor: "#32D583",
      pixelDotColor: "#F4F4F4",
      labelBackgroundColor: "#05070d",
      labelTextColor: "#F4F4F4",
      gridSize: 64,
      lineWidth: 2,
      lineThickness: 2,
      showCircle: false,
      showDiagonal: false,
      showCenterCrosshair: true,
      showScreenName: true,
      showResolution: true,
      showCabinetInfo: true
    },
    animation: { type: "radial-wave", primaryColor: "#2B68FF", secondaryColor: "#32D583", speed: 0.7, direction: "left-to-right" }
  },
  {
    id: "checker-phase",
    label: "Checker / Pixel Phase",
    fillColor: "#111111",
    borderColor: "#F4F4F4",
    pattern: {
      type: "checkerboard",
      mode: "global",
      backgroundColor: "#111111",
      primaryColor: "#F4F4F4",
      secondaryColor: "#111111",
      gridColor: "#FF3030",
      cabinetGridColor: "#FF3030",
      moduleGridColor: "#858585",
      pixelDotColor: "#F4F4F4",
      labelBackgroundColor: "#080808",
      labelTextColor: "#F4F4F4",
      gridSize: 64,
      lineWidth: 1,
      showCircle: false,
      showDiagonal: false,
      showCenterCrosshair: false,
      showScreenName: true,
      showResolution: true,
      showCabinetInfo: false
    },
    animation: { type: "pulse", primaryColor: "#F4F4F4", secondaryColor: "#111111", speed: 0.6, direction: "left-to-right" }
  },
  {
    id: "rgb-broadcast",
    label: "RGB Broadcast / Color Bars",
    fillColor: "#111111",
    borderColor: "#FFFFFF",
    pattern: {
      type: "rgb-bars",
      mode: "local",
      backgroundColor: "#000000",
      primaryColor: "#FFFFFF",
      secondaryColor: "#FF3030",
      gridColor: "#FF3030",
      cabinetGridColor: "#FF3030",
      moduleGridColor: "#32D583",
      pixelDotColor: "#F4F4F4",
      labelBackgroundColor: "#080808",
      labelTextColor: "#F4F4F4",
      showCircle: false,
      showDiagonal: false,
      showCenterCrosshair: false,
      showScreenName: true,
      showResolution: true,
      showCabinetInfo: true
    },
    animation: { type: "gradient-wipe", primaryColor: "#FFFFFF", secondaryColor: "#2B68FF", speed: 0.9, direction: "left-to-right" }
  }
];
