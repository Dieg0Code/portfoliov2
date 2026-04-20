export type MicrographicStatus =
  | "mapped"
  | "claimed"
  | "component-ready"
  | "implemented";

export type MicrographicSeed = {
  id: number;
  batch: number;
  name: string;
  summary: string;
  sourceSvg: string;
  status: MicrographicStatus;
  claimedBy: string | null;
  claimedAt: string | null;
  componentPath: string | null;
  notes: string | null;
};
