"use client";

import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
  type ReactNode
} from "react";

type FlowLayerProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  range?: number;
  rotate?: number;
  style?: CSSProperties;
  x?: number;
  y?: number;
};

function joinClassNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function FlowLayer<T extends ElementType = "div">({
  as,
  children,
  className,
  style,
  ...rest
}: FlowLayerProps<T> &
  Omit<
    ComponentPropsWithoutRef<T>,
    keyof FlowLayerProps<T> | "children" | "className" | "style"
  >) {
  const Component = (as ?? "div") as ElementType;

  return (
    <Component
      {...rest}
      className={joinClassNames("flow-layer", className)}
      style={style}
    >
      {children}
    </Component>
  );
}
