function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSelectionTooltip(source: string, translated: string): string {
  return `
    <div class="wpt-selection-tooltip">
      <div><strong>原文：</strong>${escapeHtml(source)}</div>
      <div><strong>译文：</strong>${escapeHtml(translated)}</div>
    </div>
  `.trim();
}

