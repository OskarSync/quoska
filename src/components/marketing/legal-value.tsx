import { Fragment } from "react";

/**
 * Renders a legal value. If the value still contains a `[TODO: ...]`
 * placeholder (operator data not yet provided by Oskar), it is highlighted so
 * it cannot be missed before going live.
 */
export function LegalValue({
  value,
  children,
}: {
  value?: string | null;
  children?: React.ReactNode;
}) {
  const raw = value ?? null;

  if (!raw) {
    return (
      <span className="placeholder">— nicht angegeben —</span>
    );
  }

  if (raw.includes("[TODO:")) {
    return <span className="placeholder">{raw}</span>;
  }

  return <Fragment>{children ?? raw}</Fragment>;
}
