/**
 * V Foods Unified Motion Tokens & Design Physics
 * Rules:
 * - Animate only transform and opacity (never width, height, top, or left)
 * - Decelerate on enter, accelerate on exit
 * - Stagger lists by at most 30ms per item, cap total at 300ms
 * - Instant fallback for reduced-motion preference
 */

export const motionDurations = {
  micro: 0.12,     // 120ms - icon states, chip switches, button presses
  standard: 0.22,  // 220ms - dialogs, tabs, card entries
  emphasis: 0.35,  // 350ms - bottom sheets, full page transitions
}

export const motionEasings = {
  // Decelerate curve for entering elements
  decelerate: [0.16, 1, 0.3, 1],
  // Accelerate curve for leaving elements
  accelerate: [0.7, 0, 0.84, 0],
  // Standard smooth curve
  standard: [0.2, 0, 0, 1],
}

export const motionSprings = {
  // Sheet transitions
  sheet: {
    type: 'spring',
    damping: 28,
    stiffness: 300,
    mass: 0.8,
  },
  // Layout moves & shared element transitions
  layout: {
    type: 'spring',
    damping: 24,
    stiffness: 260,
    mass: 0.7,
  },
  // Bouncy micro-feedback (cart badge bump, button tap)
  tap: {
    scale: 0.97,
    transition: { duration: 0.1, ease: [0.16, 1, 0.3, 1] },
  },
}

// Fade + Slide enter transition for cards and list items
export const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: motionDurations.standard, ease: motionEasings.decelerate } },
  exit: { opacity: 0, y: -8, transition: { duration: motionDurations.micro, ease: motionEasings.accelerate } },
}

// Staggered list container generator (capped at 300ms total)
export function getStaggerContainer(itemCount = 1) {
  const step = Math.min(0.03, 0.3 / Math.max(itemCount, 1))
  return {
    initial: {},
    animate: {
      transition: {
        staggerChildren: step,
        delayChildren: 0.02,
      },
    },
  }
}

// Direction-aware horizontal page slide for tab navigation
export function getSlideVariants(direction = 1) {
  return {
    enter: {
      x: direction > 0 ? 24 : -24,
      opacity: 0,
    },
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: motionDurations.standard, ease: motionEasings.decelerate },
      },
    },
    exit: {
      x: direction > 0 ? -20 : 20,
      opacity: 0,
      transition: {
        duration: motionDurations.micro,
        ease: motionEasings.accelerate,
      },
    },
  }
}
