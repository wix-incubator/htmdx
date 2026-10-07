import {
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { PageChromeContext } from '../../../react/page-chrome';
import { safeHref } from '../../rendering';
import { Page } from '../Page/Page';
import { Screenshot } from '../Screenshot/Screenshot';
import { Variants } from '../Variants/Variants';
import { domAttributes } from '../shared/attributes';
import {
  PreviewContext,
  usePagesExtension,
  ScreenshotLibrary,
  type PageModel,
  type PageStatus,
  type PagesInfo,
} from '../shared/variants-context';
import { flatten, ofType, readVariants, slug, text } from '../shared/variants-model';

type Props = Record<string, unknown> & { children?: ReactNode };

type PageEntry = PageModel & {
  description: string;
  group: string;
  inNav: boolean;
  link?: { label: string; url: string };
  aside: ReactNode[];
  body: ReactNode[];
};

const OVERVIEW = '';

function readPages(children: ReactNode) {
  const nodes = flatten(children);
  const library = new Map<string, { src: string; alt: string }>();
  for (const shot of ofType(nodes, Screenshot)) {
    const name = text(shot.props.name);
    if (name) {
      library.set(name, { src: text(shot.props.src), alt: text(shot.props.alt) });
    }
  }
  const keys = new Set<string>();
  const pages: PageEntry[] = ofType(nodes, Page).map((page) => {
    const props = page.props as Props;
    const title = text(props.title);
    const base = slug(title);
    let key = base;
    for (let n = 2; keys.has(key); n += 1) {
      key = `${base}-${n}`;
    }
    keys.add(key);
    const content = flatten(props.children);
    // A Screenshot directly on a page sits beside its title, as context for
    // what the page is about.
    const aside = ofType(content, Screenshot);
    const link = props.link as { label?: string; url?: string } | undefined;
    const url = link?.url ? safeHref(link.url) : null;
    return {
      key,
      title,
      description: text(props.description),
      group: text(props.group),
      inNav: props.nav !== false,
      link: url ? { label: link?.label || url, url } : undefined,
      aside,
      body: content.filter((node) => !aside.includes(node as ReactElement<Props>)),
      variants: ofType(content, Variants).map((variants) => readVariants(variants.props)),
    };
  });
  const overview = nodes.filter(
    (node) =>
      !(isValidElement(node) && node.type === Page) &&
      !(isValidElement<Props>(node) && node.type === Screenshot && text(node.props.name)) &&
      !(typeof node === 'string' && !node.trim()),
  );
  return { library, pages, overview };
}

type PagesProps = {
  name?: string;
  tilesLabel?: string;
  otherLabel?: string;
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>;

// A set of pages read one at a time: an overview with a tile per page, and
// one page open at a time. Under the creator-kit layout the nav takes the
// page's left rail and the hero shrinks while a page is open; anywhere else,
// and below the width where the rail hides, it draws its own nav.
export function Pages({
  name = '',
  tilesLabel = 'Pages',
  otherLabel = 'Also covered',
  className,
  children,
  ...props
}: PagesProps) {
  const { library, pages, overview } = useMemo(() => readPages(children), [children]);
  const extension = usePagesExtension();
  const attributes = domAttributes(props);
  const data = Object.fromEntries(
    Object.entries(props).flatMap(([key, value]) =>
      key.startsWith('data-') ? [[key.slice(5), String(value)]] : [],
    ),
  );
  const dataKey = JSON.stringify(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const info: PagesInfo = useMemo(() => ({ name, data, pages }), [name, dataKey, pages]);
  const [current, setCurrent] = useState(OVERVIEW);
  const chrome = useContext(PageChromeContext);
  const slot = chrome?.navSlot ?? null;
  const page = pages.find((candidate) => candidate.key === current);
  const onPage = !!page;
  useEffect(() => {
    chrome?.setCompactHero(onPage);
  }, [chrome, onPage]);
  useEffect(() => () => chrome?.setCompactHero(false), [chrome]);

  const root = useRef<HTMLElement>(null);
  const open = (key: string) => {
    setCurrent(key);
    // Under creator-kit the hero shrinks as the page opens, which would move
    // a scroll target while it is being scrolled to; the top of the document
    // is where the page starts. Elsewhere, the top of the pages.
    requestAnimationFrame(() =>
      chrome
        ? globalThis.scrollTo?.({ top: 0, behavior: 'smooth' })
        : root.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    );
  };
  const nav = <PagesNav info={info} current={page ? current : OVERVIEW} open={open} />;

  return (
    <ScreenshotLibrary.Provider value={library}>
      <section
        {...attributes}
        ref={root}
        data-htmdx-component="Pages"
        className={['htmdx-component htmdx-pages', slot ? 'is-in-rail' : 'has-own-nav', className]
          .filter(Boolean)
          .join(' ')}
      >
        {slot && createPortal(<div className="htmdx-pages-railnav">{nav}</div>, slot)}
        <div className="htmdx-pages-ownnav">{nav}</div>
        <div className="htmdx-pages-stage">
          {page ? (
            <PageView key={page.key} page={page} />
          ) : (
            <Overview
              overview={overview}
              info={info}
              open={open}
              tilesLabel={tilesLabel}
              otherLabel={otherLabel}
            />
          )}
          {extension?.after?.(info)}
        </div>
      </section>
    </ScreenshotLibrary.Provider>
  );
}

function PagesNav({
  info,
  current,
  open,
}: {
  info: PagesInfo;
  current: string;
  open: (key: string) => void;
}) {
  const extension = usePagesExtension();
  const pages = info.pages as PageEntry[];
  // Pages kept out of the nav are listed on the Overview instead. Grouped by
  // their `group`, in the order each group first appears.
  const shown = pages.filter((page) => page.inNav);
  const grouped = shown.some((page) => page.group);
  const groups = new Map<string, PageEntry[]>();
  for (const page of shown) {
    const group = grouped ? page.group || 'Other' : '';
    groups.set(group, [...(groups.get(group) ?? []), page]);
  }
  // When the nav is a scrolling strip, keep the open page's pill in view.
  const strip = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = strip.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) {
      return;
    }
    const left = active.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + active.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = left - 8;
    }
  }, [current]);

  const item = (key: string, label: string, status?: PageStatus) => (
    <button
      key={key}
      type="button"
      className="htmdx-pages-nav-item"
      aria-current={current === key ? 'page' : undefined}
      onClick={() => open(key)}
    >
      <span className="htmdx-pages-nav-name">{label}</span>
      {status && (
        <span
          className={`htmdx-pages-check is-${status}`}
          title={status === 'final' ? 'Final' : 'Selected, not final yet'}
        >
          ✓
        </span>
      )}
    </button>
  );
  return (
    <nav ref={strip} className="htmdx-pages-nav" aria-label="Pages">
      {item(OVERVIEW, 'Overview')}
      {[...groups].map(([group, members]) => (
        <div key={group} className="htmdx-pages-nav-group">
          {group && <div className="htmdx-pages-nav-heading">{group}</div>}
          {members.map((page) => item(page.key, page.title, extension?.status?.(page, info)))}
        </div>
      ))}
    </nav>
  );
}

function Overview({
  overview,
  info,
  open,
  tilesLabel,
  otherLabel,
}: {
  overview: ReactNode[];
  info: PagesInfo;
  open: (key: string) => void;
  tilesLabel: string;
  otherLabel: string;
}) {
  const extension = usePagesExtension();
  const pages = info.pages as PageEntry[];
  const shown = pages.filter((page) => page.inNav);
  const other = pages.filter((page) => !page.inNav);
  return (
    <div className="htmdx-pages-overview">
      {overview}
      <div className="htmdx-pages-index">
        <h3>
          {tilesLabel} ({shown.length})
        </h3>
        <div className="htmdx-pages-tiles">
          {shown.map((page) => {
            const status = extension?.status?.(page, info) ?? null;
            return (
              // Not a <button>: a preview can contain buttons of its own, and
              // nesting them breaks the tile apart.
              <div
                key={page.key}
                id={`htmdx-pages-${page.key}-tile`}
                className={`htmdx-pages-tile${status ? ` is-${status}` : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => open(page.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    open(page.key);
                  }
                }}
              >
                <span className="htmdx-pages-tile-canvas" aria-hidden="true" inert>
                  <span className="htmdx-pages-tile-scale">
                    <PreviewContext.Provider value>{page.body}</PreviewContext.Provider>
                  </span>
                </span>
                <span className="htmdx-pages-tile-foot">
                  <span className="htmdx-pages-tile-name">{page.title}</span>
                  {status && (
                    <span
                      className={`htmdx-pages-tile-tag is-${status}`}
                      title={status === 'final' ? undefined : 'Selected, not final yet'}
                    >
                      {status === 'final' ? '✓ Final' : '✓ Selected'}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {other.length > 0 && (
          <div className="htmdx-pages-other">
            <h4>{otherLabel}</h4>
            <ul>
              {other.map((page) => (
                <li key={page.key}>
                  <a
                    href={`#htmdx-pages-${page.key}`}
                    onClick={(event) => {
                      event.preventDefault();
                      open(page.key);
                    }}
                  >
                    {page.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function PageView({ page }: { page: PageEntry }) {
  return (
    <div id={`htmdx-pages-${page.key}`}>
      <header className="htmdx-pages-head">
        <div className="htmdx-pages-head-text">
          <h2 className="htmdx-pages-title">{page.title}</h2>
          {page.description && <p className="htmdx-pages-desc">{page.description}</p>}
          {page.link && (
            <a
              className="htmdx-pages-head-link"
              href={page.link.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {page.link.label}
            </a>
          )}
        </div>
        {page.aside}
      </header>
      <div className="htmdx-pages-body">{page.body}</div>
    </div>
  );
}

export const pagesStyles = `
  .htmdx-pages, .htmdx-pages-railnav {
    --pages-accent: var(--md-sys-color-primary);
    --pages-accent-ink: var(--md-sys-color-on-primary-container);
    --pages-accent-soft: var(--md-sys-color-primary-container);
    --pages-accent-hover: color-mix(in srgb, var(--pages-accent) 6%, transparent);
    --pages-ink: var(--md-sys-color-on-surface);
    --pages-body: var(--md-sys-color-on-surface-variant);
    --pages-muted: #a1a1aa;
    --pages-line: var(--md-sys-color-outline-variant);
    --pages-card: var(--md-sys-color-surface-container-lowest, #fff);
    --pages-frame: var(--md-sys-color-surface-container-low);
    --pages-final: #2e7d4f;
  }
  .htmdx-pages { color: var(--pages-ink); scroll-margin-top: calc(88px + var(--stash-top-bar-height, 0px)); }
  .htmdx-pages button, .htmdx-pages-railnav button { font-family: inherit; }
  /* Tailwind's reset strips list bullets. */
  .htmdx-pages ul { list-style: disc; }
  .htmdx-pages.has-own-nav { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 24px; align-items: start; }
  .htmdx-pages.has-own-nav > .htmdx-pages-ownnav { position: sticky; top: calc(88px + var(--stash-top-bar-height, 0px)); }
  .htmdx-pages.is-in-rail > .htmdx-pages-ownnav { display: none; }
  .htmdx-pages-stage { min-width: 0; }
  .htmdx-pages-overview { display: flex; flex-direction: column; gap: 20px; }
  /* Pages read as their own page, so the section card around them steps
     aside instead of holding them to the reading column. */
  .htmdx-doc-section-card:has(> .htmdx-content-component > .htmdx-pages) { width: auto; padding: 0; background: none; }

  .htmdx-pages-nav { display: flex; flex-direction: column; gap: 2px; }
  .htmdx-pages-nav-group { display: flex; flex-direction: column; gap: 2px; }
  .htmdx-pages-nav-heading { padding: 18px 12px 10px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--pages-muted); }
  .htmdx-pages-nav-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 18px; border: 0; border-radius: 9999px; background: none; color: #4f4444; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer; transition: background .12s ease, color .12s ease; }
  .htmdx-pages-nav-item:hover { background: var(--pages-accent-hover); }
  .htmdx-pages-nav-item[aria-current] { background: var(--pages-accent-soft); color: var(--pages-accent-ink); font-weight: 600; }
  .htmdx-pages-nav-name { flex: 1; min-width: 0; }
  /* In the rail, the nav reads like the layout's own section list. */
  .htmdx-pages-railnav .htmdx-pages-nav-item { padding: 13px 18px; color: var(--md-sys-color-on-surface-variant); font-family: var(--md-ref-typeface-brand); font-size: 0.875rem; line-height: 18px; }
  .htmdx-pages-railnav .htmdx-pages-nav-item[aria-current] { background: var(--md-sys-color-nav-active-container); color: var(--md-sys-color-on-nav-active-container); }
  .htmdx-pages-railnav .htmdx-pages-nav-heading { padding: 18px 18px 8px; }
  .htmdx-pages-check { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 16px; height: 16px; box-sizing: border-box; border-radius: 50%; font-size: 10px; font-weight: 800; }
  .htmdx-pages-check.is-final { background: var(--pages-final); color: #fff; }
  .htmdx-pages-check.is-selected { border: 1.5px solid var(--pages-accent); color: var(--pages-accent); }

  .htmdx-pages-index { padding: 28px 32px 32px; border: 1px solid var(--pages-line); border-radius: 16px; background: var(--pages-card); }
  .htmdx-pages-index.htmdx-pages-index.htmdx-pages-index > h3 { margin: 0 0 16px; font-size: 19px; font-weight: 500; }
  .htmdx-pages-tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .htmdx-pages-tile { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--pages-line); border-radius: 12px; background: var(--pages-card); cursor: pointer; }
  .htmdx-pages-tile:hover { border-color: var(--pages-accent); }
  .htmdx-pages-tile:focus-visible { outline: 2px solid var(--pages-accent); outline-offset: 2px; }
  .htmdx-pages-tile-canvas { display: flex; align-items: center; justify-content: center; height: 104px; overflow: hidden; padding: 8px; border-radius: 8px; background: var(--pages-frame); }
  .htmdx-pages-tile-scale { display: block; zoom: .3; pointer-events: none; }
  .htmdx-pages-tile-foot { display: flex; align-items: center; gap: 8px; }
  .htmdx-pages-tile-name { flex: 1; min-width: 0; font-size: 13.5px; font-weight: 600; }
  /* A tile shows its page's status like the nav does: teal while selected,
     green once final. The thicker border is offset by a pixel less padding so
     the grid does not shift when a tile changes state. */
  .htmdx-pages-tile.is-selected { border: 2px solid var(--pages-accent); background: color-mix(in srgb, var(--pages-accent) 7%, var(--pages-card)); padding: 9px; }
  .htmdx-pages-tile.is-final { border: 2px solid var(--pages-final); background: #f2f9f4; padding: 9px; }
  .htmdx-pages-tile-tag { flex-shrink: 0; padding: 3px 8px; border-radius: 9999px; font-size: 10.5px; font-weight: 800; letter-spacing: .02em; white-space: nowrap; }
  .htmdx-pages-tile-tag.is-selected { border: 1.5px solid var(--pages-accent); background: #fff; color: var(--pages-accent); }
  .htmdx-pages-tile-tag.is-final { border: 1.5px solid var(--pages-final); background: var(--pages-final); color: #fff; }
  .htmdx-pages-other { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--pages-frame); }
  .htmdx-pages-other.htmdx-pages-other.htmdx-pages-other h4 { margin: 0 0 8px; font-size: 15px; font-weight: 500; }
  .htmdx-pages-other.htmdx-pages-other.htmdx-pages-other ul { margin: 0; padding-left: 18px; }
  .htmdx-pages-other.htmdx-pages-other.htmdx-pages-other li { font-size: 14px; line-height: 1.7; color: var(--pages-body); }
  .htmdx-pages .htmdx-pages-other a { color: var(--pages-body); text-decoration: none; border-bottom: 1px solid var(--pages-line); }
  .htmdx-pages .htmdx-pages-other a:hover { color: var(--pages-accent); border-bottom-color: var(--pages-accent); }

  .htmdx-pages-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 0 8px; margin-bottom: 18px; }
  .htmdx-pages-head-text { flex: 1; min-width: 0; }
  .htmdx-pages-title.htmdx-pages-title.htmdx-pages-title { margin: 0; font-size: 32px; font-weight: 500; letter-spacing: -.01em; }
  .htmdx-pages-desc.htmdx-pages-desc.htmdx-pages-desc { max-width: 680px; margin: 8px 0 0; font-size: 15px; line-height: 1.55; color: var(--pages-body); }
  .htmdx-pages .htmdx-pages-head-link { display: inline-flex; gap: 5px; margin-top: 8px; color: var(--pages-accent); font-size: 12.5px; font-weight: 600; text-decoration: none; }
  .htmdx-pages .htmdx-pages-head-link::after { content: '↗'; font-size: 11px; }
  .htmdx-pages-body { display: flex; flex-direction: column; gap: 16px; }

  @media (max-width: 1100px) { .htmdx-pages-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  /* Narrow: the layout hides its rail and a nav column no longer fits, so the
     nav becomes a scrolling strip above the pages. */
  @media (max-width: 960px) {
    .htmdx-pages.has-own-nav { grid-template-columns: minmax(0, 1fr); gap: 16px; }
    .htmdx-pages.has-own-nav > .htmdx-pages-ownnav { position: static; }
    .htmdx-pages.is-in-rail > .htmdx-pages-ownnav { display: block; margin-bottom: 16px; }
    .htmdx-pages-ownnav .htmdx-pages-nav { flex-direction: row; align-items: center; gap: 6px; overflow-x: auto; padding: 8px; border-radius: 9999px; background: var(--pages-frame); scrollbar-width: none; }
    .htmdx-pages-ownnav .htmdx-pages-nav-group { display: contents; }
    .htmdx-pages-ownnav .htmdx-pages-nav-heading { display: none; }
    .htmdx-pages-ownnav .htmdx-pages-nav-item { flex-shrink: 0; width: auto; padding: 9px 16px; white-space: nowrap; }
    .htmdx-pages-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .htmdx-pages-title.htmdx-pages-title.htmdx-pages-title { font-size: 24px; }
    .htmdx-pages-head { flex-direction: column; padding: 0; }
    .htmdx-pages-index { padding: 20px; }
  }
  @media (max-width: 600px) { .htmdx-pages-tiles { grid-template-columns: minmax(0, 1fr); } }
`;
