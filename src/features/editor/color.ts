export function colorWithAlpha(color: string, alpha: number) {
  const clampedAlpha = Math.min(1, Math.max(0, alpha));

  if (/^#[0-9a-f]{6}$/i.test(color)) {
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);
    return `rgba(${red},${green},${blue},${clampedAlpha})`;
  }

  return color;
}

export const patternRenderConstants = {
  calibrationCheckerAlpha: 0.34,
  calibrationGridAlpha: 0.58,
  moduleGridAlpha: 0.42,
  pixelDotAlpha: 0.32,
  pixelDotStepXDivisor: 80,
  pixelDotStepYDivisor: 50
};

export const animationRenderConstants = {
  gradientBaseOpacity: 0.1,
  gradientHeadOpacity: 0.58,
  horizontalWipeOpacity: 0.34,
  verticalWipeOpacity: 0.34,
  scannerOpacity: 0.5,
  blinkOpacity: 0.42
};

export function pulseAnimationOpacity(time: number, speed: number) {
  return 0.5 + Math.sin(time * speed * Math.PI * 2) * 0.2;
}

export function adaptiveLabelSize(requestedSize: number, width: number, height: number) {
  const automaticSize = Math.min(72, Math.max(28, Math.round(Math.min(width, height) * 0.056)));
  return Math.max(requestedSize, automaticSize);
}
