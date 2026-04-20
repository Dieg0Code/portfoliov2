import { InlineSvgAsset, type InlineSvgAssetProps } from "@/components/micrographics/inline-svg-asset";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type GlobeGridBadgeProps = Omit<InlineSvgAssetProps, "markup"> & {
  assets: SelectedMicrographicMarkup;
};

export function GlobeGridBadge({
  assets,
  ...props
}: GlobeGridBadgeProps) {
  return <InlineSvgAsset markup={assets.globeGridBadge} {...props} />;
}
