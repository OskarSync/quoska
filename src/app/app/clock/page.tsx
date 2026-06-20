/**
 * Clock Page — /app/clock
 *
 * The main time tracking interface.
 * Server component that renders the client-side ClockView.
 * No separate heading — the ClockView handles its own centered layout.
 */

import { ClockView } from "@/components/clock-view";

export default function ClockPage() {
  return <ClockView />;
}
