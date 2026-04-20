"use client";

import {
  LazyMotion,
  domAnimation,
  motion,
  useReducedMotion,
  type HTMLMotionProps
} from "motion/react";
import type { CSSProperties, ReactNode } from "react";

type MotionLinkProps = {
  children: ReactNode;
  className?: string;
  emphasis?: "primary" | "secondary";
  style?: CSSProperties;
} & Omit<HTMLMotionProps<"a">, "children" | "className" | "style">;

const hoverStateMap = {
  primary: {
    scale: 1.01,
    y: -2
  },
  secondary: {
    y: -2
  }
} as const;

export function MotionLink({
  children,
  className,
  emphasis = "secondary",
  style,
  ...rest
}: MotionLinkProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <LazyMotion features={domAnimation}>
      <motion.a
        {...rest}
        className={className}
        style={style}
        whileHover={prefersReducedMotion ? undefined : hoverStateMap[emphasis]}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.99, y: 0 }}
      >
        {children}
      </motion.a>
    </LazyMotion>
  );
}
