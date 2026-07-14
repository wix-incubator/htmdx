import type { LabelNumber, LabelValue, MarkdownListCards } from './body-contracts';

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

export function renderNarrativeContent(body: string) {
  return renderMarkdown(body);
}

export function renderMetricsContent(body: LabelValue[]) {
  const items = body
    .map(
      ({ label, value }) => `
        <div class="htmdx-metric-item">
          <span class="htmdx-metric-label">${escapeHtml(label)}</span>
          <span class="htmdx-metric-value">${inline(stripWrappingBold(value))}</span>
        </div>`,
    )
    .join('');

  return `<div class="htmdx-metric-grid">${items}</div>`;
}

export function renderBarChartContent(name: string, body: LabelNumber[]) {
  const max = Math.max(...body.map(({ value }) => value), 1);
  const chartWidth = 640;
  const chartHeight = 240;
  const paddingX = 34;
  const axisY = 206;
  const slotWidth = (chartWidth - paddingX * 2) / body.length;
  const barWidth = Math.max(28, Math.min(72, slotWidth * 0.68));
  const bars = body
    .map(({ label, value }, index) => {
      const height = (value / max) * 172;
      const x = paddingX + index * slotWidth + (slotWidth - barWidth) / 2;
      const y = axisY - height;
      return `
        <rect class="htmdx-chart-bar" data-series="${index % 5}" x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="7">
          <title>${escapeHtml(label)}: ${escapeHtml(String(value))}</title>
        </rect>
        <text class="htmdx-chart-label" x="${x + barWidth / 2}" y="234" text-anchor="middle">${escapeHtml(
          truncateLabel(label),
        )}</text>`;
    })
    .join('');

  return `<div class="htmdx-chart"><svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img" aria-label="${escapeHtml(
    name,
  )} chart"><line class="htmdx-chart-axis" x1="${paddingX}" y1="${axisY}" x2="${
    chartWidth - paddingX
  }" y2="${axisY}" />${bars}</svg></div>`;
}

export function renderFeatureCardsContent(body: MarkdownListCards) {
  return `<div class="htmdx-feature-grid">${body.items
    .map((item) => renderFeatureItem(item))
    .join('')}</div>`;
}

export function componentShell(name: string, body: string) {
  return `
    <section class="htmdx-component htmdx-${kebab(name)}" data-htmdx-component="${escapeHtml(name)}">
      <div class="htmdx-component-header">${escapeHtml(name)}</div>
      <div class="htmdx-component-body">${body}</div>
    </section>`;
}

export function renderFeatureItem(item: string, tier = '') {
  const match = item.match(/^\*\*([^*]+)\*\*:?\s*(.*)$/);
  const tierAttribute = tier ? ` data-tier="${tier}"` : '';

  if (!match) {
    return `<div class="htmdx-feature-item"${tierAttribute}><span class="htmdx-feature-text">${inline(item)}</span></div>`;
  }

  const label = match[1].replace(/\s*:\s*$/, '');

  return `
    <div class="htmdx-feature-item"${tierAttribute}>
      <span class="htmdx-feature-title">${escapeHtml(label)}</span>
      <span class="htmdx-feature-text">${inline(match[2])}</span>
    </div>`;
}

function parseList(body: string) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function stripWrappingBold(value: string) {
  return value.replace(/^\*\*(.*)\*\*$/, '$1');
}

function kebab(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
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

function truncateLabel(value: string) {
  return value.length > 22 ? `${value.slice(0, 19)}...` : value;
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
