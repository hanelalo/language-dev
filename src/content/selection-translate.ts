export function buildSelectionTooltip(source: string, translated: string): string {
  return `
    <div class="wpt-selection-tooltip">
      <div><strong>原文：</strong>${source}</div>
      <div><strong>译文：</strong>${translated}</div>
    </div>
  `.trim();
}
