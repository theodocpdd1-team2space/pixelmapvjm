import { z } from "zod";
import type { Prisma } from "@prisma/client";

const cabinetSchema = z.object({
  presetId: z
    .enum(["p625-500", "p391-500", "p260-500", "p2604-500", "p2976-500", "p481-500", "p195-500", "strip-512x256", "custom"])
    .default("p391-500"),
  pixelWidth: z.number().int().positive().default(128),
  pixelHeight: z.number().int().positive().default(128),
  modulePixelWidth: z.number().int().positive().default(64),
  modulePixelHeight: z.number().int().positive().default(64),
  showCabinetGrid: z.boolean().default(true),
  showModuleGrid: z.boolean().default(false),
  showPixelDots: z.boolean().default(true)
  ,physicalWidthMm: z.number().positive().default(500)
  ,physicalHeightMm: z.number().positive().default(500)
  ,pixelPitchMm: z.number().positive().default(3.91)
  ,manualOverride: z.boolean().default(false)
  ,cabinetColumns: z.number().int().positive().default(1)
  ,cabinetRows: z.number().int().positive().default(1)
  ,cabinetLineThickness: z.number().positive().default(2)
  ,cabinetLineOpacity: z.number().min(0).max(1).default(0.62)
  ,showCabinetNumbers: z.boolean().default(false)
  ,cabinetStartNumber: z.number().int().default(1)
  ,scanDirection: z.enum(["left-to-right", "right-to-left", "top-to-bottom", "bottom-to-top"]).default("left-to-right")
});

const defaultCabinetSchemaValue = {
  presetId: "p391-500" as const,
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
  ,scanDirection: "left-to-right" as const
};

const animationSchema = z.object({
  type: z
    .enum([
      "none",
      "gradient-wipe",
      "horizontal-wipe",
      "vertical-wipe",
      "scanner",
      "radial-wave",
      "fade-gradient-circle",
      "pulse",
      "blink",
      "strobe-sequence",
      "strobe-random"
    ])
    .default("gradient-wipe"),
  primaryColor: z.string().default("#32D583"),
  secondaryColor: z.string().default("#FF3030"),
  speed: z.number().positive().default(1),
  direction: z.enum(["left-to-right", "right-to-left", "top-to-bottom", "bottom-to-top"]).default("left-to-right")
});

const patternSchema = z.object({
  type: z
    .enum([
      "mapper-calibration",
      "calibration",
      "solid",
      "grid",
      "checkerboard",
      "crosshair",
      "concentric-circles",
      "diagonal-lines",
      "rgb-bars",
      "screen-label"
    ])
    .default("mapper-calibration"),
  mode: z.enum(["local", "global"]).default("global"),
  primaryColor: z.string().default("#FF3030"),
  secondaryColor: z.string().default("#20F26D"),
  backgroundColor: z.string().default("#020806"),
  gridColor: z.string().default("#D9FFE7"),
  moduleGridColor: z.string().default("#43F58A"),
  pixelDotColor: z.string().default("#E9FFF1"),
  lineWidth: z.number().positive().default(2),
  gridSize: z.number().int().positive().default(64),
  labelSize: z.number().int().positive().default(28),
  showScreenName: z.boolean().default(true),
  showResolution: z.boolean().default(true),
  showCoordinates: z.boolean().default(false),
  showCabinetInfo: z.boolean().default(true)
  ,lineThickness: z.number().positive().default(3)
  ,edgeThickness: z.number().positive().default(4)
  ,dashedLineLength: z.number().positive().default(24)
  ,dashedLineGap: z.number().positive().default(18)
  ,circleCount: z.number().int().min(1).max(20).default(5)
  ,showCircle: z.boolean().default(true)
  ,showDiagonal: z.boolean().default(true)
  ,showCenterCrosshair: z.boolean().default(true)
  ,showSize: z.boolean().default(true)
  ,showPosition: z.boolean().default(false)
  ,showScreenIndex: z.boolean().default(false)
  ,showLogo: z.boolean().default(false)
  ,logoDataUrl: z.string().optional()
  ,cabinetGridColor: z.string().default("#FF3030")
  ,cabinetGridThickness: z.number().positive().default(2)
  ,labelBackgroundColor: z.string().default("#050505")
  ,labelTextColor: z.string().default("#F4F4F4")
  ,labelBackgroundOpacity: z.number().min(0).max(1).default(0.94)
});

const defaultPatternSchemaValue = {
  type: "mapper-calibration" as const,
  mode: "global" as const,
  primaryColor: "#FF3030",
  secondaryColor: "#20F26D",
  backgroundColor: "#020806",
  gridColor: "#D9FFE7",
  moduleGridColor: "#43F58A",
  pixelDotColor: "#E9FFF1",
  lineWidth: 2,
  gridSize: 64,
  labelSize: 28,
  showScreenName: true,
  showResolution: true,
  showCoordinates: false,
  showCabinetInfo: true
  ,lineThickness: 3
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
  ,labelBackgroundColor: "#050505"
  ,labelTextColor: "#F4F4F4"
  ,labelBackgroundOpacity: 0.94
};

const defaultAnimationSchemaValue = {
  type: "gradient-wipe" as const,
  primaryColor: "#32D583",
  secondaryColor: "#FF3030",
  speed: 1.25,
  direction: "left-to-right" as const
};

const maskPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1)
});
const defaultMaskSchemaValue = {
  type: "none" as const,
  points: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 }
  ]
};
const maskSchema = z.object({
  type: z.enum(["none", "rectangle", "triangle", "trapezoid", "custom"]).default("none"),
  points: z.array(maskPointSchema).min(3).max(12).default(defaultMaskSchemaValue.points)
});

const pixelNumberSchema = z.preprocess((value) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return value;
  }
  return Math.round(value);
}, z.number().int());

export const editorScreenSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["rectangle", "square", "led-strip", "quadrilateral", "group", "logo"]),
  x: pixelNumberSchema,
  y: pixelNumberSchema,
  width: pixelNumberSchema.pipe(z.number().positive()),
  height: pixelNumberSchema.pipe(z.number().positive()),
  rotation: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
  opacity: z.number().min(0).max(1),
  fillColor: z.string(),
  borderColor: z.string(),
  borderWidth: z.number().min(0),
  locked: z.boolean(),
  visible: z.boolean(),
  zIndex: z.number().int(),
  groupId: z.string().nullable(),
  cabinet: cabinetSchema.default(defaultCabinetSchemaValue),
  mask: maskSchema.default(defaultMaskSchemaValue),
  pattern: patternSchema.default(defaultPatternSchemaValue),
  animation: animationSchema.default(defaultAnimationSchemaValue),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const projectPageJsonSchema = z.object({
  app: z.literal("PixelMapVJM").default("PixelMapVJM"),
  format: z.literal("pixelmapvjm-project").default("pixelmapvjm-project"),
  schemaVersion: z.number().int().positive().default(1),
  version: z.literal(1),
  page: z.object({
    name: z.string().min(1),
    canvas: z.object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      fps: z.number().int().min(1).max(120),
      duration: z.number().int().min(1).max(3600),
      backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
      backgroundTransparent: z.boolean().default(false),
      gridSize: z.number().int().min(1).default(64),
      snappingEnabled: z.boolean().default(true),
      gridVisible: z.boolean().default(true)
    }),
    screens: z.array(editorScreenSchema).default([]),
    animationSettings: z.record(z.string(), z.any()).default({})
  })
});

export type ProjectPageJson = z.infer<typeof projectPageJsonSchema>;

export function createDefaultProjectJson(name: string, width = 1920, height = 1080): ProjectPageJson {
  return {
    app: "PixelMapVJM",
    format: "pixelmapvjm-project",
    schemaVersion: 1,
    version: 1,
    page: {
      name,
      canvas: {
        width,
        height,
        fps: 30,
        duration: 10,
        backgroundColor: "#000000",
        backgroundTransparent: false,
        gridSize: 64,
        snappingEnabled: true,
        gridVisible: true
      },
      screens: [],
      animationSettings: {
        pattern: "none",
        speed: 1,
        loop: true
      }
    }
  };
}

export function toPrismaJson(value: ProjectPageJson): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}
