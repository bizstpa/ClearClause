/** Tiny element helper — text is set via textContent, never innerHTML. */
export function el(
  tag: string,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElement {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value) node.setAttribute(key, value);
  }
  if (text !== undefined) node.textContent = text;
  return node;
}
