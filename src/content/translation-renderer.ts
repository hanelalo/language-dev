type Status = "pending" | "running" | "done" | "failed";

const STATUS_COLOR: Record<Status, string> = {
  pending: "#9ca3af",
  running: "#16a34a",
  done: "#7c3aed",
  failed: "#dc2626"
};

export function renderTranslationBlock(source: string, translated: string, status: Status): string {
  const color = STATUS_COLOR[status];
  return `
    <div class="wpt-segment">
      <p class="wpt-source">${source}</p>
      <p class="wpt-translated" style="border-left:4px solid ${color};padding-left:10px;">${translated}</p>
      <hr style="border-top:1px dashed #999;" />
    </div>
  `.trim();
}