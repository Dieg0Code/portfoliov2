import { InlineSvgAsset, type InlineSvgAssetProps } from "@/components/micrographics/inline-svg-asset";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type ConcentricArcRadarScaleProps = Omit<InlineSvgAssetProps, "markup"> & {
  assets: SelectedMicrographicMarkup;
};

export function ConcentricArcRadarScale({
  assets,
  ...props
}: ConcentricArcRadarScaleProps) {
  return <InlineSvgAsset markup={assets.concentricArcRadarScale} {...props} />;
}
