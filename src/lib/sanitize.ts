/**
 * Escape HTML entities to prevent XSS in user-generated content.
 *
 * Intended for HTML **text content** contexts only (e.g. ECharts tooltip
 * innerHTML). Not suitable for use inside JavaScript, URL, or CSS attribute
 * contexts — use context-specific encoding for those.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}