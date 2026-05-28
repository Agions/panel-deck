/**
 * panel-flow Shared Utils - Motion/Animation Utilities
 */

import { Variants, Easing, Transition } from 'framer-motion';

export const transitions = {
  fast: { duration: 0.15 },
  normal: { duration: 0.25 },
  slow: { duration: 0.35 },
};

export const easings = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1],
  accelerate: [0.4, 0, 1, 1],
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: easings.standard as unknown as Easing },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2, ease: easings.accelerate as unknown as Easing },
  },
};

export const fadeInVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export const scaleInVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const listItemVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: easings.standard as unknown as Easing },
  }),
};

export const cardHoverVariants: Variants = {
  rest: { y: 0, boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)' },
  hover: {
    y: -5,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
    transition: { duration: 0.2, ease: easings.standard as unknown as Easing },
  },
};

export const buttonTapVariants: Variants = {
  rest: { scale: 1 },
  tap: { scale: 0.98 },
};

export const skeletonVariants: Variants = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: 1,
    transition: { repeat: Infinity, repeatType: 'reverse' as const, duration: 1 },
  },
};

export const createPageTransition = (customTransitions?: {
  duration?: number;
  ease?: number[];
}) => ({
  ...pageVariants,
  animate: {
    ...pageVariants.animate,
    transition: {
      ...(pageVariants.animate as { transition?: Transition }).transition,
      duration: customTransitions?.duration,
      ease: customTransitions?.ease as unknown as Easing | undefined,
    },
  },
});

export const createStaggerChildren = (delay: number = 0.05) => ({
  animate: {
    transition: { staggerChildren: delay },
  },
});