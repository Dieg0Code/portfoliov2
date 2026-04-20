import type { ComponentPropsWithoutRef } from "react";

export type InlineSvgAssetProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children"
> & {
  markup: string;
  label?: string;
};

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function InlineSvgAsset({
  markup,
  label,
  className,
  ...props
}: InlineSvgAssetProps) {
  return (
    <span
      {...props}
      className={joinClassNames("inline-svg-asset", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
