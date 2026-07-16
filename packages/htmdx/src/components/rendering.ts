export type HtmdxHeading = {
  id: string;
  label: string;
};

export type RenderContext = {
  headings: HtmdxHeading[];
  slugCounts: Map<string, number>;
};

export function renderMarkdown(markdown: string, context?: RenderContext) {
  return markdown
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((block) => renderMarkdownBlock(block, context))
    .join('');
}

function renderMarkdownBlock(block: string, context?: RenderContext) {
  if (block.startsWith('### ')) {
    return `<h3>${inline(block.slice(4))}</h3>`;
  }
  if (block.startsWith('## ')) {
    const label = block.slice(3);
    const id = context ? uniqueSlug(label, context) : slugify(label);
    if (context) {
      context.headings.push({ id, label });
    }
    return `<h2 id="${id}">${inline(label)}</h2>`;
  }
  if (block.startsWith('# ')) {
    return `<h1>${inline(block.slice(2))}</h1>`;
  }
  if (block.startsWith('- ')) {
    return `<ul>${parseList(block)
      .map((item) => `<li>${inline(item)}</li>`)
      .join('')}</ul>`;
  }

  return `<p>${inline(block.replace(/\n/g, ' '))}</p>`;
}

function parseList(body: string) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function uniqueSlug(value: string, context: RenderContext) {
  const base = slugify(value);
  const count = context.slugCounts.get(base) || 0;
  context.slugCounts.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'section';
}

export function inline(text: string) {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, href: string) => {
      const safeHref = sanitizeHref(href);
      return safeHref ? `<a href="${safeHref}">${label}</a>` : label;
    });
}

function sanitizeHref(value: string) {
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
    return compact.startsWith('//') ? null : escapeHtml(decoded);
  }

  const allowedSchemes = new Set(['http', 'https', 'mailto']);
  return allowedSchemes.has(schemeMatch[1].toLowerCase()) ? escapeHtml(decoded) : null;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
