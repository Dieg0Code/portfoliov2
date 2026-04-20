import { InlineSvgAsset, type InlineSvgAssetProps } from "@/components/micrographics/inline-svg-asset";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type DigitalOutputChannelPanelProps = Omit<InlineSvgAssetProps, "markup"> & {
  assets: SelectedMicrographicMarkup;
};

export function DigitalOutputChannelPanel({
  assets,
  ...props
}: DigitalOutputChannelPanelProps) {
  return <InlineSvgAsset markup={assets.digitalOutputChannelPanel} {...props} />;
}
