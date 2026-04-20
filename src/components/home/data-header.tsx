import { ScrambleText } from "@/components/home/scramble-text";
import { ScanIndicator } from "@/components/home/ascii-motion";

type DataHeaderProps = {
  location: string;
  status: string;
  stamp: string;
  className?: string;
};

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function DataHeader({
  location,
  status,
  stamp,
  className
}: DataHeaderProps) {
  return (
    <dl className={joinClassNames("data-header data-header--live", className)}>
      <div>
        <dt>LOC</dt>
        <dd>{location}</dd>
      </div>
      <div>
        <dt>STATUS</dt>
        <dd className="data-header__status-line">
          <span aria-hidden="true" className="data-header__pip" />
          <ScrambleText
            as="span"
            className="data-header__status"
            text={status}
            trigger="hover"
            hoverDuration={240}
          />
          <ScanIndicator className="data-header__scan" />
        </dd>
      </div>
      <div>
        <dt>TS</dt>
        <dd>{stamp}</dd>
      </div>
    </dl>
  );
}
