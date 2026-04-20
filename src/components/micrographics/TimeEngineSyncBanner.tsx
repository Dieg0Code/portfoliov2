import { InlineSvgAsset, type InlineSvgAssetProps } from "@/components/micrographics/inline-svg-asset";
import type { SelectedMicrographicMarkup } from "@/lib/micrographics/selected-assets";

type TimeEngineSyncBannerProps = Omit<InlineSvgAssetProps, "markup"> & {
  assets: SelectedMicrographicMarkup;
};

export function TimeEngineSyncBanner({
  assets,
  ...props
}: TimeEngineSyncBannerProps) {
  return <InlineSvgAsset markup={assets.timeEngineSyncBanner} {...props} />;
}
