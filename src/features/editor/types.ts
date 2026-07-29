export type EditorTool = "select" | "hand";

export type SaveStatus =
  | "EDITING"
  | "SAVING LOCAL"
  | "LOCAL SAVED"
  | "SYNCING CLOUD"
  | "CLOUD SYNCED"
  | "SYNC FAILED - LOCAL COPY SAFE";

export type ScreenType = "rectangle" | "square" | "led-strip" | "quadrilateral" | "group" | "logo";

export type EditorScreen = {
  id: string;
  name: string;
  type: ScreenType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  locked: boolean;
  visible: boolean;
  zIndex: number;
  groupId: string | null;
  cabinet: CabinetSettings;
  pattern: Record<string, unknown>;
  animation: ScreenAnimationSettings;
  metadata: Record<string, unknown>;
};

export type StaticPatternType =
  | "mapper-calibration"
  | "calibration"
  | "solid"
  | "grid"
  | "checkerboard"
  | "crosshair"
  | "concentric-circles"
  | "diagonal-lines"
  | "rgb-bars"
  | "screen-label";

export type PatternMode = "local" | "global";

export type ScreenPatternSettings = {
  type: StaticPatternType;
  mode: PatternMode;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  lineWidth: number;
  gridSize: number;
  labelSize: number;
  showScreenName: boolean;
  showResolution: boolean;
  showCoordinates: boolean;
  showCabinetInfo: boolean;
  lineThickness: number;
  edgeThickness: number;
  dashedLineLength: number;
  dashedLineGap: number;
  circleCount: number;
  showCircle: boolean;
  showDiagonal: boolean;
  showCenterCrosshair: boolean;
  showSize: boolean;
  showPosition: boolean;
  showScreenIndex: boolean;
  showLogo: boolean;
  logoDataUrl?: string;
  cabinetGridColor: string;
  cabinetGridThickness: number;
  labelBackgroundOpacity: number;
};

export const defaultScreenPattern: ScreenPatternSettings = {
  type: "mapper-calibration",
  mode: "global",
  primaryColor: "#FF3030",
  secondaryColor: "#32D583",
  backgroundColor: "#080808",
  lineWidth: 2,
  gridSize: 64,
  labelSize: 28,
  showScreenName: true,
  showResolution: true,
  showCoordinates: false,
  showCabinetInfo: true
  ,lineThickness: 2
  ,edgeThickness: 4
  ,dashedLineLength: 24
  ,dashedLineGap: 18
  ,circleCount: 5
  ,showCircle: true
  ,showDiagonal: true
  ,showCenterCrosshair: true
  ,showSize: true
  ,showPosition: false
  ,showScreenIndex: false
  ,showLogo: false
  ,cabinetGridColor: "#FF3030"
  ,cabinetGridThickness: 2
  ,labelBackgroundOpacity: 0.88
};

export type CabinetPresetId =
  | "p625-500"
  | "p391-500"
  | "p260-500"
  | "p2976-500"
  | "p481-500"
  | "p195-500"
  | "p2604-500"
  | "strip-512x256"
  | "custom";

export type CabinetSettings = {
  presetId: CabinetPresetId;
  pixelWidth: number;
  pixelHeight: number;
  modulePixelWidth: number;
  modulePixelHeight: number;
  showCabinetGrid: boolean;
  showModuleGrid: boolean;
  showPixelDots: boolean;
  physicalWidthMm: number;
  physicalHeightMm: number;
  pixelPitchMm: number;
  manualOverride: boolean;
  cabinetColumns: number;
  cabinetRows: number;
  cabinetLineThickness: number;
  cabinetLineOpacity: number;
  showCabinetNumbers: boolean;
  cabinetStartNumber: number;
  scanDirection: "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top";
};

export type AnimationType =
  | "none"
  | "gradient-wipe"
  | "horizontal-wipe"
  | "vertical-wipe"
  | "scanner"
  | "radial-wave"
  | "pulse"
  | "blink";

export type ScreenAnimationSettings = {
  type: AnimationType;
  primaryColor: string;
  secondaryColor: string;
  speed: number;
  direction: "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top";
};

export const defaultScreenAnimation: ScreenAnimationSettings = {
  type: "gradient-wipe",
  primaryColor: "#32D583",
  secondaryColor: "#FF3030",
  speed: 1.25,
  direction: "left-to-right"
};

export type EditorCanvasSettings = {
  name: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
  backgroundColor: string;
  backgroundTransparent: boolean;
  gridSize: number;
  snappingEnabled: boolean;
  gridVisible: boolean;
};

export type EditorPageLink = {
  id: string;
  name: string;
  width: number;
  height: number;
};

export type EditorInitialDocument = {
  projectId: string;
  pageId: string;
  projectName: string;
  pages: EditorPageLink[];
  canvas: EditorCanvasSettings;
  screens: EditorScreen[];
  serverUpdatedAt: string;
};

export type HistorySnapshot = {
  canvas: EditorCanvasSettings;
  screens: EditorScreen[];
  selectedIds: string[];
};
