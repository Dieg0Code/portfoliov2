import { InlineSvgAsset, type InlineSvgAssetProps } from "@/components/micrographics/inline-svg-asset";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type ArrowHeaderCardProps = Omit<InlineSvgAssetProps, "markup"> & {
  assets: SelectedMicrographicMarkup;
};

export function ArrowHeaderCard({
  assets,
  ...props
}: ArrowHeaderCardProps) {
  return <InlineSvgAsset markup={assets.arrowHeaderCard} {...props} />;
}
