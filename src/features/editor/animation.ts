import type { AnimationType, EditorScreen } from "@/features/editor/types";

export function isStrobeAnimation(type: AnimationType) {
  return type === "strobe-sequence" || type === "strobe-random";
}

function seededIndex(seed: number, count: number) {
  const mixed = Math.imul(seed ^ 0x9e3779b9, 1664525) + 1013904223;
  return Math.abs(mixed) % count;
}

export function getStrobeAnimationState(screen: EditorScreen, screens: EditorScreen[], time: number) {
  if (!isStrobeAnimation(screen.animation.type)) {
    return { active: false, opacity: 0 };
  }

  const strobeScreens = screens
    .filter((item) => item.visible && item.type !== "logo" && item.animation.type === screen.animation.type)
    .slice()
    .sort((a, b) => a.zIndex - b.zIndex);
  const screenIndex = strobeScreens.findIndex((item) => item.id === screen.id);

  if (screenIndex < 0 || strobeScreens.length === 0) {
    return { active: false, opacity: 0 };
  }

  const speed = Math.max(0.1, screen.animation.speed);
  const position = time * speed;
  const slot = Math.floor(position);
  const phase = position - slot;
  const activeIndex =
    screen.animation.type === "strobe-random" ? seededIndex(slot, strobeScreens.length) : slot % strobeScreens.length;
  const active = activeIndex === screenIndex && phase < 0.62;

  return {
    active,
    opacity: active ? 0.82 : 0
  };
}
