// Pure rendering utilities shared by the React runtime: heading slugs, link
// scheme checks, and HTML escaping for the error fallback. Markdown itself is
// rendered as React elements in ../react/markdown.
export type HtmdxHeading = {
  id: string;
  label: string;
};

export type RenderContext = {
  headings: HtmdxHeading[];
  slugCounts: Map<string, number>;
};

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'section';
}

export function uniqueSlug(value: string, context: RenderContext) {
  const base = slugify(value);
  const count = context.slugCounts.get(base) || 0;
  context.slugCounts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

// Returns a safe href (http/https/mailto or relative), or null for blocked
// schemes. React encodes the attribute, so the value is returned undecorated.
export function safeHref(value: string): string | null {
  const decoded = value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
  const compact = Array.from(decoded)
    .filter((char) => char.charCodeAt(0) > 31 && char.charCodeAt(0) !== 127 && !/\s/.test(char))
    .join('');
  if (!compact) {
    return null;
  }

  const schemeMatch = compact.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!schemeMatch) {
    return compact.startsWith('//') ? null : decoded;
  }

  const allowedSchemes = new Set(['http', 'https', 'mailto']);
  return allowedSchemes.has(schemeMatch[1].toLowerCase()) ? decoded : null;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
