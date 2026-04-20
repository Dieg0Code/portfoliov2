"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type FocusEvent,
  type MouseEvent
} from "react";

const scrambleCharacters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#@%=+/<>[]";

type ScrambleTrigger = "mount" | "hover" | "both";

type ScrambleTextProps<T extends ElementType> = {
  as?: T;
  className?: string;
  text: string;
  trigger?: ScrambleTrigger;
  mountDuration?: number;
  hoverDuration?: number;
};

function joinClassNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function randomCharacter() {
  const index = Math.floor(Math.random() * scrambleCharacters.length);
  return scrambleCharacters[index] ?? "#";
}

export function ScrambleText<T extends ElementType = "span">({
  as,
  className,
  text,
  trigger = "hover",
  mountDuration = 720,
  hoverDuration = 360,
  ...rest
}: ScrambleTextProps<T> &
  Omit<
    ComponentPropsWithoutRef<T>,
    keyof ScrambleTextProps<T> | "children" | "className"
  >) {
  const Component = (as ?? "span") as ElementType;
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const animateRef = useRef<(mode: "mount" | "hover") => void>(() => undefined);
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const userOnFocus = (rest as { onFocus?: (event: FocusEvent<Element>) => void })
    .onFocus;
  const userOnMouseEnter = (
    rest as { onMouseEnter?: (event: MouseEvent<Element>) => void }
  ).onMouseEnter;

  const stopAnimation = () => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  useEffect(() => {
    animateRef.current = (mode: "mount" | "hover") => {
      if (typeof window === "undefined") {
        setDisplayText(text);
        return;
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplayText(text);
        return;
      }

      stopAnimation();
      setIsAnimating(true);

      const characters = Array.from(text);
      const totalFrames = Math.max(
        12,
        Math.round((mode === "mount" ? mountDuration : hoverDuration) / 16.67)
      );
      let frame = 0;

      const tick = () => {
        const progress = frame / totalFrames;
        const nextText = characters
          .map((character, index) => {
            if (character === " ") {
              return " ";
            }

            const start = (index / Math.max(characters.length, 1)) * 0.58;
            const end = Math.min(1, start + 0.34);

            if (progress >= end) {
              return character;
            }

            if (mode === "hover" && progress < start) {
              return character;
            }

            return randomCharacter();
          })
          .join("");

        setDisplayText(nextText);

        if (frame < totalFrames) {
          frame += 1;
          frameRef.current = requestAnimationFrame(tick);
          return;
        }

        setDisplayText(text);
        setIsAnimating(false);
        frameRef.current = null;
      };

      frameRef.current = requestAnimationFrame(tick);
    };
  }, [text, mountDuration, hoverDuration]);

  useEffect(() => {
    const syncText = requestAnimationFrame(() => {
      setDisplayText(text);
    });

    if (!mountedRef.current) {
      mountedRef.current = true;

      if (trigger === "mount" || trigger === "both") {
        const kickoff = requestAnimationFrame(() => {
          animateRef.current("mount");
        });

        return () => {
          cancelAnimationFrame(syncText);
          cancelAnimationFrame(kickoff);
          stopAnimation();
        };
      }
    } else if (trigger === "mount" || trigger === "both") {
      const kickoff = requestAnimationFrame(() => {
        animateRef.current("mount");
      });

      return () => {
        cancelAnimationFrame(syncText);
        cancelAnimationFrame(kickoff);
        stopAnimation();
      };
    }

    return () => {
      cancelAnimationFrame(syncText);
      stopAnimation();
    };
  }, [text, trigger, mountDuration, hoverDuration]);

  return (
    <Component
      {...rest}
      aria-label={text}
      className={joinClassNames(
        "scramble-text",
        (trigger === "hover" || trigger === "both") &&
        "scramble-text--interactive",
        isAnimating && "is-animating",
        className
      )}
      onFocus={(event: FocusEvent<Element>) => {
        if (trigger === "hover" || trigger === "both") {
          animateRef.current("hover");
        }

        if (typeof userOnFocus === "function") {
          userOnFocus(event);
        }
      }}
      onMouseEnter={(event: MouseEvent<Element>) => {
        if (trigger === "hover" || trigger === "both") {
          animateRef.current("hover");
        }

        if (typeof userOnMouseEnter === "function") {
          userOnMouseEnter(event);
        }
      }}
    >
      <span aria-hidden="true">{displayText}</span>
    </Component>
  );
}
