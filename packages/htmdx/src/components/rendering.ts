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

export type SafeImageAttributes = {
  src: string;
  alt: string;
  className: string;
  title?: string;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
  decoding?: 'async' | 'auto' | 'sync';
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

export function safeImageAttributes(
  attributes: Record<string, string | undefined>,
): SafeImageAttributes | null {
  const normalized = new Map(
    Object.entries(attributes).map(([name, value]) => [name.toLowerCase(), value]),
  );
  const src = safeImageSrc(normalized.get('src') || '');
  if (!src) {
    return null;
  }

  const className = ['htmdx-image', normalized.get('class'), normalized.get('classname')]
    .filter(Boolean)
    .join(' ');
  const result: SafeImageAttributes = {
    src,
    alt: normalized.get('alt') || '',
    className,
  };

  const title = normalized.get('title');
  if (title) {
    result.title = title;
  }
  const width = normalized.get('width');
  if (width && /^\d+$/.test(width)) {
    result.width = Number(width);
  }
  const height = normalized.get('height');
  if (height && /^\d+$/.test(height)) {
    result.height = Number(height);
  }
  const loading = normalized.get('loading');
  if (loading === 'lazy' || loading === 'eager') {
    result.loading = loading;
  }
  const decoding = normalized.get('decoding');
  if (decoding === 'async' || decoding === 'auto' || decoding === 'sync') {
    result.decoding = decoding;
  }
  return result;
}

function safeImageSrc(value: string) {
  const decoded = decodeHtmlEntities(value).trim();
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

  const scheme = schemeMatch[1].toLowerCase();
  if (scheme === 'http' || scheme === 'https') {
    return decoded;
  }
  if (scheme !== 'data' || !/^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,]/i.test(compact)) {
    return null;
  }
  return decoded;
}

export function decodeHtmlEntities(value: string) {
  const named = new Map([
    ['amp', '&'],
    ['quot', '"'],
    ['apos', "'"],
    ['lt', '<'],
    ['gt', '>'],
  ]);
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|(amp|quot|apos|lt|gt));/gi,
    (entity, decimal: string | undefined, hex: string | undefined, name: string | undefined) => {
      if (name) {
        return named.get(name.toLowerCase()) || entity;
      }
      const codePoint = Number.parseInt(decimal || hex || '', decimal ? 10 : 16);
      return Number.isInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : entity;
    },
  );
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
