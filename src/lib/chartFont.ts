import { Chart } from "chart.js";

// Charts draw on a canvas, so they don't inherit the page's CSS font. Point Chart.js at the
// site's body font (Source Sans 3, loaded by next/font) so chart labels match the text around them.
// Call at module level in client pages that render charts; it is a no-op during server rendering.
export function applySiteFontToCharts() {
  if (typeof document === "undefined") return;
  Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
}
