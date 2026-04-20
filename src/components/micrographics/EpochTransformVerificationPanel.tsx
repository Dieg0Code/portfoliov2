import { InlineSvgAsset, type InlineSvgAssetProps } from "@/components/micrographics/inline-svg-asset";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type EpochTransformVerificationPanelProps = Omit<InlineSvgAssetProps, "markup"> & {
  assets: SelectedMicrographicMarkup;
};

export function EpochTransformVerificationPanel({
  assets,
  ...props
}: EpochTransformVerificationPanelProps) {
  return (
    <InlineSvgAsset markup={assets.epochTransformVerificationPanel} {...props} />
  );
}
