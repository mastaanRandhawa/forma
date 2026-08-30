import { ReactNode, ElementType, HTMLAttributes } from "react";

type SurfaceProps = {
  children?: ReactNode;
  className?: string;
  as?: ElementType;
  /** raised surfaces only: enables hover-lift / press-in */
  interactive?: boolean;
} & HTMLAttributes<HTMLElement>;

function make(base: string) {
  return function Surface({
    children,
    className = "",
    as: Tag = "div",
    interactive = false,
    ...rest
  }: SurfaceProps) {
    const cls = [
      base,
      interactive && base === "surface-raised" ? "surface-raised--interactive tactile" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <Tag className={cls} {...rest}>
        {children}
      </Tag>
    );
  };
}

/** broad molded UI regions — translucent, not glass */
export const SoftSurface = make("surface-soft");

/** tactile primary controls — brighter, convex, hover-lifts */
export const RaisedSurface = make("surface-raised");

/** carved-in wells: metric trays, dial tracks, date strips, inputs */
export const RecessedSurface = make("surface-recessed");

/** used sparingly: floating nav, one or two overlays */
export const GlassSurface = make("surface-glass");

/** pebble/capsule: indicator bubbles, FAB, selected pill, dial thumb */
export function FloatingPill({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: SurfaceProps) {
  return (
    <Tag className={`surface-float ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
