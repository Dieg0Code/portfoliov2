import { InlineSvgAsset, type InlineSvgAssetProps } from "@/components/micrographics/inline-svg-asset";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type OrbitArcDividerProps = Omit<InlineSvgAssetProps, "markup"> & {
  assets: SelectedMicrographicMarkup;
};

export function OrbitArcDivider({
  assets,
  ...props
}: OrbitArcDividerProps) {
  return <InlineSvgAsset markup={assets.orbitArcDivider} {...props} />;
}
