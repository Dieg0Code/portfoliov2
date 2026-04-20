"use client";

import {
  LazyMotion,
  domAnimation,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants
} from "motion/react";
import type { CSSProperties, ReactNode } from "react";

type MotionRevealVariant = "rise" | "slide-left" | "slide-right";
type MotionRevealTag = "article" | "aside" | "div" | "footer" | "p" | "span";
type MotionHoverEffect = "lift-md" | "lift-sm" | "none";

type MotionRevealProps = {
  as?: MotionRevealTag;
  children: ReactNode;
  className?: string;
  delay?: number;
  hoverEffect?: MotionHoverEffect;
  rootMargin?: string;
  threshold?: number;
  variant?: MotionRevealVariant;
  style?: CSSProperties;
} & Omit<HTMLMotionProps<"div">, "children" | "className" | "style">;

const revealVariants: Record<MotionRevealVariant, Variants> = {
  rise: {
    hidden: {
      opacity: 0,
      y: 18
    },
    visible: {
      opacity: 1,
      y: 0
    }
  },
  "slide-left": {
    hidden: {
      opacity: 0,
      x: -24
    },
    visible: {
      opacity: 1,
      x: 0
    }
  },
  "slide-right": {
    hidden: {
      opacity: 0,
      x: 24
    },
    visible: {
      opacity: 1,
      x: 0
    }
  }
};

const motionTags = {
  article: motion.article,
  aside: motion.aside,
  div: motion.div,
  footer: motion.footer,
  p: motion.p,
  span: motion.span
} as const;

const hoverEffects = {
  "lift-md": {
    y: -5
  },
  "lift-sm": {
    y: -3
  },
  none: undefined
} as const;

function joinClassNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function MotionReveal({
  as = "div",
  children,
  className,
  delay = 0,
  hoverEffect = "none",
  rootMargin = "0px 0px -10% 0px",
  threshold = 0.05,
  variant = "rise",
  style,
  ...rest
}: MotionRevealProps) {
  const MotionTag = motionTags[as];
  const prefersReducedMotion = useReducedMotion();
  const variants = revealVariants[variant];
  const hoverState =
    prefersReducedMotion || hoverEffect === "none"
      ? undefined
      : hoverEffects[hoverEffect];

  const motionProps = prefersReducedMotion
    ? {
        initial: false
      }
    : {
        initial: "hidden" as const,
        transition: {
          delay: delay / 1000,
          duration: 0.56,
          ease: [0.16, 1, 0.3, 1] as const
        },
        variants,
        viewport: {
          amount: threshold,
          margin: rootMargin,
          once: true
        },
        whileInView: "visible" as const
      };

  return (
    <LazyMotion features={domAnimation}>
      <MotionTag
        {...motionProps}
        {...rest}
        className={joinClassNames("motion-reveal", className)}
        style={style}
        whileHover={hoverState}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.995 }}
      >
        {children}
      </MotionTag>
    </LazyMotion>
  );
}
