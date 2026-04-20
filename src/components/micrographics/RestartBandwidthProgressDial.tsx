import { InlineSvgAsset, type InlineSvgAssetProps } from "@/components/micrographics/inline-svg-asset";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type RestartBandwidthProgressDialProps = Omit<InlineSvgAssetProps, "markup"> & {
  assets: SelectedMicrographicMarkup;
};

export function RestartBandwidthProgressDial({
  assets,
  ...props
}: RestartBandwidthProgressDialProps) {
  return (
    <InlineSvgAsset markup={assets.restartBandwidthProgressDial} {...props} />
  );
}
