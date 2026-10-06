import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { BUILT_IN_LOGOS } from '../../../logos';
import { safeHref } from '../../rendering';
import { InlineMarkdown } from '../shared/structured';
import { ReviewFieldContext } from '../shared/review-context';
import { diffWords } from '../shared/review-diff';
import {
  decisionsMessage,
  hasNews,
  liveComment,
  liveEdits,
  liveRequests,
  loadDecisions,
  markCommentsSent,
  pickOf,
  saveDecisions,
  setComment,
  setEdit,
  setPick,
  setRequests,
  storageKey,
  type Decisions,
} from '../shared/review-decisions';
import {
  buildReviewModel,
  CURRENT,
  reviewFingerprint,
  type ReviewElementModel,
  type ReviewVersionModel,
} from '../shared/review-model';

type ReviewLink = { label?: string; url?: string };

type ContentReviewProps = {
  title?: string;
  subtitle?: string;
  badge?: string;
  logo?: string;
  revision?: number;
  copyHint?: string;
  links?: ReviewLink[];
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>;

type Update = (change: (decisions: Decisions) => Decisions) => void;

const OVERVIEW = '';
const DEFAULT_HINT =
  'Copies a prompt for your AI agent. It updates this review with your changes and marks the versions you selected as final.';
// A highlight covering nearly the whole screenshot means the element is the
// screen, and a thumbnail would only repeat the Before panel smaller.
const WHOLE_SCREEN = 85;

// The review is a whole page, not a section of a document: a nav column the
// height of the window, and a header that names the review. Use it with
// `layout: blank`, which leaves the page chrome to it.
export function ContentReview({
  title = '',
  subtitle = '',
  badge = 'Content review',
  logo = '',
  revision = 0,
  copyHint = DEFAULT_HINT,
  links = [],
  className,
  children,
  ...attributes
}: ContentReviewProps) {
  const model = useMemo(() => buildReviewModel(children), [children]);
  const fingerprint = useMemo(() => reviewFingerprint(model, revision), [model, revision]);
  const key = storageKey(title);
  const [decisions, setDecisions] = useState<Decisions>(() => loadDecisions(key));
  const [current, setCurrent] = useState(OVERVIEW);
  const update: Update = (change) =>
    setDecisions((previous) => {
      const next = change(previous);
      saveDecisions(key, next);
      return next;
    });

  const open = (elementKey: string) => {
    setCurrent(elementKey);
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  };
  const element = model.elements.find((candidate) => candidate.key === current);
  const shownLinks = (Array.isArray(links) ? links : []).flatMap((link) => {
    const url = link && typeof link.url === 'string' ? safeHref(link.url) : null;
    return url ? [{ url, label: link.label || link.url! }] : [];
  });
  const logoSrc = BUILT_IN_LOGOS.get(logo);

  return (
    <section
      {...(attributes as HTMLAttributes<HTMLElement>)}
      data-htmdx-component="ContentReview"
      className={['htmdx-component htmdx-review', className].filter(Boolean).join(' ')}
    >
      <aside className="htmdx-review-rail">
        <ReviewNav
          elements={model.elements}
          decisions={decisions}
          current={element ? current : OVERVIEW}
          open={open}
        />
        {logoSrc && <img className="htmdx-review-logo" src={logoSrc} alt="" />}
      </aside>
      <div className="htmdx-review-main">
        <div className="htmdx-review-measure">
          {/* The review's identity and nothing else. On an element page it is
              identification already read, so it shrinks to one line. */}
          <header className={`htmdx-review-hero${element ? ' is-compact' : ''}`}>
            {badge && <span className="htmdx-review-badge">{badge}</span>}
            <h1>{title}</h1>
            {subtitle && <span className="htmdx-review-location">{subtitle}</span>}
            {/* The first link is the one a reviewer reaches for, usually the
                prototype, so it renders solid. */}
            {shownLinks.length > 0 && (
              <div className="htmdx-review-links">
                {shownLinks.map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </header>
          {element ? (
            <ElementView
              key={element.key}
              element={element}
              decisions={decisions}
              fingerprint={fingerprint}
              update={update}
            />
          ) : (
            <Overview overview={model.overview} elements={model.elements} open={open} />
          )}
          <DecisionsBar
            title={title}
            hint={copyHint}
            elements={model.elements}
            decisions={decisions}
            fingerprint={fingerprint}
            update={update}
          />
        </div>
      </div>
    </section>
  );
}

function ReviewNav({
  elements,
  decisions,
  current,
  open,
}: {
  elements: ReviewElementModel[];
  decisions: Decisions;
  current: string;
  open: (key: string) => void;
}) {
  // Only changed elements: one with nothing to decide is named on the
  // Overview instead of costing a row here on every visit. Grouped by where
  // they live in the product, never by how much changed.
  const shown = elements.filter((element) => element.changed);
  const grouped = shown.some((element) => element.group);
  const groups = new Map<string, ReviewElementModel[]>();
  for (const element of shown) {
    const group = grouped ? element.group || 'Other' : 'Elements';
    groups.set(group, [...(groups.get(group) ?? []), element]);
  }
  const item = (key: string, label: string, mark?: ReactNode) => (
    <button
      key={key}
      type="button"
      className="htmdx-review-nav-item"
      aria-current={current === key ? 'page' : undefined}
      onClick={() => open(key)}
    >
      <span className="htmdx-review-nav-name">{label}</span>
      {mark}
    </button>
  );
  return (
    <nav className="htmdx-review-nav" aria-label="Review">
      {item(OVERVIEW, 'Overview')}
      {[...groups].map(([group, members]) => (
        <div key={group} className="htmdx-review-nav-group">
          <div className="htmdx-review-nav-heading">{group}</div>
          {members.map((element) => {
            // A filled check once a version is Final, an outline one while it
            // is only selected in this browser.
            const pick = pickOf(decisions, element);
            const final = pick !== null && pick === element.final;
            const mark =
              pick === null ? undefined : (
                <span
                  className={`htmdx-review-check ${final ? 'is-final' : 'is-selected'}`}
                  title={final ? 'Final' : 'Selected, not final yet'}
                >
                  ✓
                </span>
              );
            return item(element.key, element.name, mark);
          })}
        </div>
      ))}
    </nav>
  );
}

// The recreated component sits in a wrapper that resets the document's own
// typography, so the copy wraps the way it will in the product rather than
// the way this page styles its headings and paragraphs.
function Mockup({
  version,
  before,
  onEdit,
}: {
  version: ReviewVersionModel;
  before?: Record<string, string>;
  onEdit?: (field: string, text: string) => void;
}) {
  return (
    <ReviewFieldContext.Provider value={{ values: version.values, before, onEdit }}>
      <div className="htmdx-review-mockup">{version.mockup}</div>
    </ReviewFieldContext.Provider>
  );
}

function Overview({
  overview,
  elements,
  open,
}: {
  overview: ReactNode[];
  elements: ReviewElementModel[];
  open: (key: string) => void;
}) {
  const changed = elements.filter((element) => element.changed);
  const untouched = elements.filter((element) => !element.changed);
  return (
    <div className="htmdx-review-overview">
      {overview}
      <div className="htmdx-review-card" id="htmdx-review-overview-index">
        <h3>Elements reviewed ({changed.length})</h3>
        <div className="htmdx-review-tiles">
          {changed.map((element) => (
            // Not a <button>: recreated components contain their own
            // buttons, and nesting them breaks the tile apart.
            <div
              key={element.key}
              id={`htmdx-review-${element.key}-tile`}
              className="htmdx-review-tile"
              role="button"
              tabIndex={0}
              onClick={() => open(element.key)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  open(element.key);
                }
              }}
            >
              <span className="htmdx-review-tile-canvas" aria-hidden="true" inert>
                <span className="htmdx-review-tile-scale">
                  {element.before && <Mockup version={element.before} />}
                </span>
              </span>
              <span className="htmdx-review-tile-name">{element.name}</span>
            </div>
          ))}
        </div>
        {untouched.length > 0 && (
          <div className="htmdx-review-nochange">
            <h4>Reviewed with no change</h4>
            <ul>
              {untouched.map((element) => (
                <li key={element.key}>
                  <a
                    href={`#htmdx-review-${element.key}`}
                    onClick={(event) => {
                      event.preventDefault();
                      open(element.key);
                    }}
                  >
                    {element.name}
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

function ElementView({
  element,
  decisions,
  fingerprint,
  update,
}: {
  element: ReviewElementModel;
  decisions: Decisions;
  fingerprint: string;
  update: Update;
}) {
  const settled = element.final !== null;
  const panels: ReviewVersionModel[] = [...element.versions];
  // A Final version is the thing to read, so it moves straight under Before,
  // which stays on top as the reference it is read against.
  if (typeof element.final === 'number') {
    panels.unshift(...panels.splice(element.final, 1));
  }
  const link = element.link?.url ? safeHref(element.link.url) : null;
  return (
    <div id={`htmdx-review-${element.key}`}>
      <header className="htmdx-review-head">
        <div className="htmdx-review-head-text">
          <h2 className="htmdx-review-title">{element.name}</h2>
          {element.description && <p className="htmdx-review-desc">{element.description}</p>}
          {link && (
            <a
              className="htmdx-review-head-link"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {element.link!.label || link}
            </a>
          )}
        </div>
        <ScreenContext element={element} />
      </header>
      <div className="htmdx-review-panels htmdx-review-section">
        {element.before && (
          <Panel
            element={element}
            version={element.before}
            decisions={decisions}
            fingerprint={fingerprint}
            update={update}
            folded={settled && element.final !== CURRENT}
          />
        )}
        {panels.map((version) => (
          <Panel
            key={String(version.ref)}
            element={element}
            version={version}
            decisions={decisions}
            fingerprint={fingerprint}
            update={update}
            folded={settled && element.final !== version.ref}
          />
        ))}
        {!element.before && !element.changed && (
          <p className="htmdx-review-desc">Reviewed, and the current text stays as it is.</p>
        )}
        {element.changed && <Requests element={element} decisions={decisions} update={update} />}
      </div>
    </div>
  );
}

// The whole screen, with this element ringed: a reviewer judging one card
// still has to know where it sits and what it sits next to.
function ScreenContext({ element }: { element: ReviewElementModel }) {
  const [zoomed, setZoomed] = useState(false);
  const thumb = useRef<HTMLButtonElement>(null);
  const { screen, highlight: ring } = element;
  const whole = !ring || (ring.w >= WHOLE_SCREEN && ring.h >= WHOLE_SCREEN);

  useEffect(() => {
    if (!zoomed) {
      return;
    }
    const onKey = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && setZoomed(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoomed]);

  // Slide the screenshot so the ringed element sits in the middle of the
  // fixed-height thumbnail, so a tall screen cannot push the comparison down.
  const fit = () => {
    const box = thumb.current;
    const shot = box?.querySelector<HTMLElement>('.htmdx-review-shot');
    const image = shot?.querySelector('img');
    const cta = box?.querySelector<HTMLElement>('.htmdx-review-context-cta');
    if (!box || !shot || !image || !ring || !image.offsetHeight) {
      return;
    }
    const view = box.clientHeight - (cta?.offsetHeight ?? 0);
    const height = image.offsetHeight;
    const top = (ring.y / 100) * height;
    const size = (ring.h / 100) * height;
    const offset = size > view ? top - 8 : top + size / 2 - view / 2;
    shot.style.top = `${-Math.max(0, Math.min(offset, height - view))}px`;
  };

  if (!screen || whole) {
    return null;
  }
  const ringStyle = {
    left: `${ring.x}%`,
    top: `${ring.y}%`,
    width: `${ring.w}%`,
    height: `${ring.h}%`,
  };
  const shot = (
    <span className="htmdx-review-shot">
      <img src={screen.src} alt={screen.alt} onLoad={fit} />
      <span className="htmdx-review-ring" style={ringStyle} />
    </span>
  );
  return (
    <>
      <button
        ref={thumb}
        type="button"
        className="htmdx-review-context"
        id={`htmdx-review-${element.key}-context`}
        title="Open the full screen"
        onClick={() => setZoomed(true)}
      >
        {shot}
        <span className="htmdx-review-context-cta">View in context ⤢</span>
      </button>
      {zoomed && (
        <div
          className="htmdx-review-overlay is-zoom"
          role="dialog"
          aria-label={screen.alt}
          onClick={() => setZoomed(false)}
        >
          <span className="htmdx-review-shot is-big">
            <img src={screen.src} alt={screen.alt} />
            <span className="htmdx-review-ring" style={ringStyle} />
          </span>
        </div>
      )}
    </>
  );
}

// Only the first sentence of a Why stays visible; the rest is detail for
// when the reader doubts it.
function splitWhy(why: string) {
  const match = why.match(/^(.+?[.!?])\s+(?=[A-Z"“(])/);
  return match
    ? { lead: match[1], rest: why.slice(match[0].length).trim() }
    : { lead: why, rest: '' };
}

function Panel({
  element,
  version,
  decisions,
  fingerprint,
  update,
  folded,
}: {
  element: ReviewElementModel;
  version: ReviewVersionModel;
  decisions: Decisions;
  fingerprint: string;
  update: Update;
  folded: boolean;
}) {
  const { ref } = version;
  const isBefore = ref === CURRENT;
  const pick = pickOf(decisions, element);
  const chosen = pick === ref;
  const isFinal = element.final === ref;
  const [open, setOpen] = useState(!folded);
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const [marks, setMarks] = useState(true);
  // Selecting a folded version opens it.
  useEffect(() => {
    if (chosen) {
      setOpen(true);
    }
  }, [chosen]);

  const edits = isBefore ? {} : liveEdits(decisions, element, ref);
  const shown = { ...version, values: { ...version.values, ...edits } };
  // Fields this review added have no Before to diff against, so they mark as
  // wholly new; a replaced component is a different thing and is not marked.
  const diffable = !isBefore && !version.replaced && element.before;
  const hasMarks =
    !!diffable &&
    Object.entries(shown.values).some(([field, value]) =>
      diffWords(element.before!.values[field] ?? '', value).some(
        (segment) => segment.kind !== 'same',
      ),
    );
  const before = diffable && marks ? element.before!.values : undefined;
  const caption = isBefore ? 'Before' : `Version ${(ref as number) + 1}`;
  const label = isBefore
    ? 'Current text'
    : version.label.replace(/^\s*(option|version)\s*\d+\s*[—–:.-]?\s*/i, '') || 'Suggested text';
  const selectLabel =
    chosen && isFinal
      ? '✓ Final'
      : isBefore
        ? chosen
          ? '✓ Keeping current text'
          : 'Keep current text'
        : chosen
          ? '✓ Selected'
          : 'Select this version';
  const id = `htmdx-review-${element.key}-${isBefore ? 'before' : `v${(ref as number) + 1}`}`;
  const foldable = !isBefore || folded;
  const why = splitWhy(version.why);
  const more = why.rest || version.assumptions.length > 0 || version.sourced;

  return (
    <article
      id={id}
      className={[
        'htmdx-review-panel',
        isBefore ? 'is-before' : 'is-after',
        chosen && 'is-chosen',
        isFinal && 'is-final',
        !open && 'is-collapsed',
        editing && 'is-editing',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="htmdx-review-panel-head"
        // The whole head folds the panel, except the buttons inside it.
        onClick={(event) => {
          if (foldable && !(event.target as Element).closest('button, label')) {
            setOpen(!open);
          }
        }}
      >
        {foldable && (
          <button
            type="button"
            className="htmdx-review-fold"
            aria-expanded={open}
            title={open ? 'Collapse this version' : 'Expand this version'}
            onClick={() => setOpen(!open)}
          >
            <span className="htmdx-review-caret" />
          </button>
        )}
        <span className="htmdx-review-titles">
          <span className="htmdx-review-caption">{caption}</span>
          <span className="htmdx-review-label">{label}</span>
          {isFinal && <span className="htmdx-review-tag is-final">Final</span>}
          {version.updated && !isFinal && (
            <span
              className="htmdx-review-tag"
              tabIndex={0}
              data-tip={`${version.updated} Select it and send it to the agent to make it final.`}
              data-tip-align="left"
            >
              Updated
            </span>
          )}
          {Object.keys(edits).length > 0 && <span className="htmdx-review-tag">Edited</span>}
        </span>
        {element.changed && !isBefore && open && (
          <button
            type="button"
            className="htmdx-review-edit"
            title="Change the wording right on the component"
            onClick={() => setEditing(editing ? null : shown.values)}
          >
            {editing ? 'Done editing' : 'Edit text'}
          </button>
        )}
        {element.changed && (
          <button
            type="button"
            className="htmdx-review-select"
            aria-pressed={chosen}
            onClick={() => update((d) => setPick(d, element, ref, !chosen))}
          >
            {selectLabel}
          </button>
        )}
      </div>
      {open && (
        <div className="htmdx-review-panel-body">
          <div
            className="htmdx-review-frame"
            // Links and buttons in a recreated component never navigate or
            // submit: it is a picture of the component, not the component.
            onClickCapture={(event) => {
              if ((event.target as Element).closest?.('a, button, [role="button"]')) {
                event.preventDefault();
              }
            }}
          >
            {editing ? (
              <Mockup
                version={{ ...shown, values: editing }}
                onEdit={(field, value) =>
                  update((d) => setEdit(d, element, ref as number, field, value))
                }
              />
            ) : (
              <Mockup version={shown} before={before} />
            )}
            {isBefore && element.flag && <FlagPin anchor={element.flagAnchor} />}
          </div>
          {isBefore && element.flag && (
            <div className="htmdx-review-flag">
              <div className="htmdx-review-flag-head">
                <span className="htmdx-review-flag-dot">!</span>
                <span className="htmdx-review-flag-label">Design flag</span>
              </div>
              <div className="htmdx-review-flag-text">
                <InlineMarkdown text={element.flag} />
              </div>
            </div>
          )}
          {(why.lead || more) && (
            <div className="htmdx-review-aside">
              {why.lead && (
                <div className="htmdx-review-why">
                  <b>Why:</b> <InlineMarkdown text={why.lead} />
                </div>
              )}
              {more && (
                <details className="htmdx-review-more">
                  <summary>Read more</summary>
                  {why.rest && (
                    <div className="htmdx-review-why">
                      <InlineMarkdown text={why.rest} />
                    </div>
                  )}
                  {version.assumptions.length > 0 && (
                    <div className="htmdx-review-assumed">
                      <b>Assumed:</b>
                      <ul>
                        {version.assumptions.map((assumption) => (
                          <li key={assumption}>
                            <InlineMarkdown text={assumption} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {version.sourced && (
                    <div className="htmdx-review-why">
                      <b>Where this came from:</b> <InlineMarkdown text={version.sourced} />
                    </div>
                  )}
                </details>
              )}
            </div>
          )}
          {chosen && element.changed && (
            <div className="htmdx-review-comment">
              <label htmlFor={`${id}-comment`}>Your comments</label>
              <textarea
                id={`${id}-comment`}
                rows={2}
                placeholder="What to keep, change or ask about in this version"
                value={liveComment(decisions, element, ref, fingerprint)}
                onChange={(event) => update((d) => setComment(d, element, ref, event.target.value))}
              />
            </div>
          )}
        </div>
      )}
      {open && hasMarks && (
        <div className="htmdx-review-foot">
          <label
            className="htmdx-review-switch"
            title="Turn off to read this version without highlights and strikethroughs"
          >
            <input type="checkbox" checked={marks} onChange={() => setMarks(!marks)} />
            <span className="htmdx-review-track" aria-hidden="true" />
            <span>Highlight changes</span>
          </label>
        </div>
      )}
    </article>
  );
}

// A pin on the field a design flag is about, placed by measurement so it
// never reflows the recreated component and changes how its copy wraps.
function FlagPin({ anchor }: { anchor: string }) {
  const pin = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const place = () => {
      const element = pin.current;
      const frame = element?.parentElement;
      if (!element || !frame) {
        return;
      }
      const target = anchor
        ? [...frame.querySelectorAll<HTMLElement>('[data-field]')].find(
            (field) => field.dataset.field === anchor,
          )
        : undefined;
      const frameBox = frame.getBoundingClientRect();
      // Beside the control the text sits in, not on top of it.
      const box = (
        target?.closest('a, button, [role="button"]') ?? target
      )?.getBoundingClientRect();
      element.style.left = box ? `${Math.max(2, box.left - frameBox.left - 34)}px` : '10px';
      element.style.top = box
        ? `${Math.max(2, box.top - frameBox.top + Math.min(box.height, 24) / 2 - 12)}px`
        : '10px';
    };
    place();
    addEventListener('resize', place);
    void document.fonts?.ready.then(place);
    return () => removeEventListener('resize', place);
  }, [anchor]);
  return (
    <span ref={pin} className="htmdx-review-pin" aria-hidden="true">
      !
    </span>
  );
}

function Requests({
  element,
  decisions,
  update,
}: {
  element: ReviewElementModel;
  decisions: Decisions;
  update: Update;
}) {
  const requests = liveRequests(decisions, element).map((request) => request.text);
  const save = (texts: string[]) => update((d) => setRequests(d, element, texts));
  return (
    <div className="htmdx-review-requests" id={`htmdx-review-${element.key}-requests`}>
      {requests.map((request, index) => (
        <div key={index} className="htmdx-review-request">
          <div className="htmdx-review-request-head">
            <span className="htmdx-review-caption">
              Version {element.versions.length + index + 1}
            </span>
            <span className="htmdx-review-label">New version</span>
            <button
              type="button"
              className="htmdx-review-request-remove"
              title="Remove this version"
              aria-label="Remove this version"
              onClick={() => save(requests.filter((_, other) => other !== index))}
            >
              ×
            </button>
          </div>
          <textarea
            rows={2}
            aria-label={`Describe version ${element.versions.length + index + 1}`}
            placeholder="Describe what it should be like: shorter, warmer, leads with the benefit"
            value={request}
            onChange={(event) =>
              save(requests.map((other, at) => (at === index ? event.target.value : other)))
            }
          />
        </div>
      ))}
      <button type="button" className="htmdx-review-add" onClick={() => save([...requests, ''])}>
        + Add another version
      </button>
    </div>
  );
}

// The async Clipboard API exists only in a secure context, and these pages
// are often opened as local files. execCommand('copy') is not gated on that,
// so it is the fallback that actually runs there.
async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = value;
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(area);
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}

const COPY_ICON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

function DecisionsBar({
  title,
  hint,
  elements,
  decisions,
  fingerprint,
  update,
}: {
  title: string;
  hint: string;
  elements: ReviewElementModel[];
  decisions: Decisions;
  fingerprint: string;
  update: Update;
}) {
  const [copied, setCopied] = useState(false);
  const [manual, setManual] = useState<string | null>(null);
  // Counts what the next copy will send. Finals were already sent; counting
  // them read as a backlog.
  const toSend = elements.filter((element) => hasNews(decisions, element, fingerprint)).length;
  const finals = elements.filter((element) => element.changed && element.final !== null).length;

  const copy = async () => {
    const message = decisionsMessage(title, elements, decisions, fingerprint);
    update((d) => markCommentsSent(d, elements, fingerprint));
    if (!(await copyText(message))) {
      // Never window.prompt(): sandboxed hosts reject it, and this button is
      // the only way decisions leave the page.
      setManual(message);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  };

  return (
    <>
      <div className="htmdx-review-bar" hidden={!toSend}>
        <span className="htmdx-review-bar-count">
          {toSend} selected
          {finals > 0 && <span className="htmdx-review-bar-final">, {finals} final</span>}
        </span>
        <button
          type="button"
          className={`htmdx-review-copy${copied ? ' is-copied' : ''}`}
          data-tip={hint}
          {...{ 'aria-description': hint }}
          onClick={copy}
        >
          {copied ? (
            'Copied. Paste it to the agent'
          ) : (
            <>
              {COPY_ICON}
              Copy to agent
            </>
          )}
        </button>
      </div>
      {manual !== null && (
        <div
          className="htmdx-review-overlay"
          onClick={(event) => event.target === event.currentTarget && setManual(null)}
        >
          <div className="htmdx-review-dialog" role="dialog" aria-label="Your decisions">
            <p>Copy this and paste it to the agent.</p>
            <textarea readOnly value={manual} ref={(area) => area?.select()} />
            <button type="button" className="htmdx-review-copy" onClick={() => setManual(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Colors that are not the page theme's are variables, so a host can set its
// own on the ContentReview tag: class="[--review-final:#1e6b43]".
export const contentReviewStyles = `
  .htmdx-review, .htmdx-review-summary {
    --review-accent: var(--md-sys-color-primary);
    --review-accent-ink: var(--md-sys-color-on-primary-container);
    --review-accent-soft: var(--md-sys-color-primary-container);
    --review-accent-hover: color-mix(in srgb, var(--review-accent) 6%, transparent);
    --review-ink: var(--md-sys-color-on-surface);
    --review-body: var(--md-sys-color-on-surface-variant);
    --review-muted: #a1a1aa;
    --review-line: var(--md-sys-color-outline-variant);
    --review-card: var(--md-sys-color-surface-container-lowest, #fff);
    --review-frame: var(--md-sys-color-surface-container-low);
    --review-final: #2e7d4f;
    --review-final-soft: #f2f9f4;
    --review-final-line: #dcefe2;
    --review-highlight: rgba(232, 185, 0, .22);
    --review-highlight-edge: #e8b900;
    --review-cut: #b3261e;
    --review-flag: #2f5d6b;
    --review-flag-text: #3f5460;
    --review-send: #2563eb;
    --review-send-ink: #1d4ed8;
    --review-send-soft: #dbe6fe;
  }
  .htmdx-review {
    --review-rail: var(--md-sys-color-nav-surface, var(--md-sys-color-surface-container));
    --review-surface: var(--md-sys-color-surface);
    --review-section: var(--md-sys-color-surface-container-low);
    --review-top: var(--stash-top-bar-height, 0px);
    display: flex; align-items: flex-start; min-height: calc(100vh - var(--review-top));
    /* The rail's colour runs the full page height from here, so the rail
       itself can stay short and sticky. */
    background: linear-gradient(to right, var(--review-rail) 0 240px, var(--review-surface) 240px 100%);
    color: var(--review-ink); font-family: var(--md-ref-typeface-plain);
  }
  .htmdx-review button { font-family: inherit; }
  /* A blank page carries Tailwind's reset, which strips list bullets. */
  .htmdx-review ul, .htmdx-review-summary ul { list-style: disc; }
  .htmdx-review-rail { position: sticky; top: var(--review-top); display: flex; flex-direction: column; flex-shrink: 0; width: 240px; height: calc(100vh - var(--review-top)); box-sizing: border-box; padding: 24px 12px; overflow-y: auto; }
  .htmdx-review-logo { display: block; flex-shrink: 0; width: 44px; margin: auto 12px 0; padding-top: 24px; pointer-events: none; }
  .htmdx-review-main { flex: 1; min-width: 0; padding: 8px 8px 96px; box-sizing: border-box; }
  .htmdx-review-measure { max-width: 1184px; margin: 0 auto; }
  .htmdx-review-overview { display: flex; flex-direction: column; gap: 20px; }

  .htmdx-review-hero { margin-bottom: 36px; padding: 44px 56px 48px; border-radius: 16px; background: var(--review-accent); color: #fff; }
  .htmdx-review-badge { display: inline-block; margin-bottom: 20px; padding: 7px 15px; border-radius: 9999px; background: #fff; color: var(--review-accent); font-size: 11.5px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em; }
  .htmdx-review-hero h1 { margin: 0 0 12px; font-size: 52px; font-weight: 500; line-height: 1.06; letter-spacing: -.02em; color: inherit; }
  .htmdx-review-location { display: block; font-size: 15px; color: rgba(255,255,255,.72); }
  .htmdx-review-hero.is-compact { display: flex; align-items: baseline; flex-wrap: wrap; gap: 14px; margin-bottom: 18px; padding: 16px 28px; border-radius: 12px; }
  .htmdx-review-hero.is-compact h1 { margin: 0; font-size: 20px; letter-spacing: 0; }
  .htmdx-review-hero.is-compact .htmdx-review-location { font-size: 13px; }
  .htmdx-review-hero.is-compact .htmdx-review-badge, .htmdx-review-hero.is-compact .htmdx-review-links { display: none; }
  .htmdx-review-links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; }
  .htmdx-review .htmdx-review-links a { display: inline-flex; align-items: center; gap: 7px; padding: 8px 15px; border: 1px solid rgba(255,255,255,.42); border-radius: 9999px; color: #fff; font-size: 13px; font-weight: 500; text-decoration: none; transition: background .12s ease, border-color .12s ease; }
  .htmdx-review .htmdx-review-links a::after { content: '↗'; font-size: 12px; opacity: .8; }
  .htmdx-review .htmdx-review-links a:hover { background: rgba(255,255,255,.14); border-color: #fff; }
  .htmdx-review .htmdx-review-links a:first-child { border-color: #fff; background: #fff; color: var(--review-accent); font-weight: 600; }
  .htmdx-review .htmdx-review-links a:first-child:hover { background: rgba(255,255,255,.88); }
  .htmdx-review-section { padding: 24px; border-radius: 28px; background: var(--review-section); }

  .htmdx-review-nav { display: flex; flex-direction: column; gap: 2px; }
  .htmdx-review-nav-heading { padding: 18px 12px 10px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--review-muted); }
  .htmdx-review-nav-group { display: flex; flex-direction: column; gap: 2px; }
  .htmdx-review-nav-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 18px; border: 0; border-radius: 9999px; background: none; color: #4f4444; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer; transition: background .12s ease, color .12s ease; }
  .htmdx-review-nav-item:hover { background: var(--review-accent-hover); }
  .htmdx-review-nav-item[aria-current] { background: var(--review-accent-soft); color: var(--review-accent-ink); font-weight: 600; }
  .htmdx-review-nav-name { flex: 1; min-width: 0; }
  .htmdx-review-check { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 16px; height: 16px; box-sizing: border-box; border-radius: 50%; font-size: 10px; font-weight: 800; }
  .htmdx-review-check.is-final { background: var(--review-final); color: #fff; }
  .htmdx-review-check.is-selected { border: 1.5px solid var(--review-accent); color: var(--review-accent); }

  .htmdx-review-card { padding: 24px 28px; border: 1px solid var(--review-line); border-left: 4px solid var(--review-accent); border-radius: 14px; background: var(--review-card); }
  #htmdx-review-overview-index { border-left-width: 1px; border-radius: 16px; padding: 28px 32px 32px; }
  .htmdx-review-card.htmdx-review-card.htmdx-review-card > h3 { margin: 0 0 10px; font-size: 18px; font-weight: 500; }
  #htmdx-review-overview-index > h3 { font-size: 19px; margin-bottom: 16px; }
  .htmdx-review-card-sub.htmdx-review-card-sub.htmdx-review-card-sub { margin: 0 0 6px; font-size: 13.5px; line-height: 1.55; color: var(--review-body); }
  .htmdx-review-summary { color: var(--review-ink); display: flex; flex-direction: column; gap: 20px; }
  .htmdx-review-fact { display: flex; gap: 16px; padding: 9px 0; border-top: 1px solid var(--review-frame); }
  .htmdx-review-fact:first-of-type { border-top: 0; padding-top: 2px; }
  .htmdx-review-fact-label { flex: 0 0 104px; padding-top: 4px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: var(--review-muted); }
  .htmdx-review-fact-value { flex: 1; min-width: 0; font-size: 15px; line-height: 1.6; color: var(--review-body); }
  .htmdx-review-assumption { padding: 8px 0; border-top: 1px solid var(--review-frame); font-size: 14.5px; line-height: 1.55; }
  .htmdx-review-assumption.htmdx-review-assumption.htmdx-review-assumption ul { margin: 6px 0 0; padding-left: 18px; font-size: 13.5px; }

  .htmdx-review-tiles { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
  .htmdx-review-tile { display: flex; flex-direction: column; gap: 8px; padding: 10px; border: 1px solid var(--review-line); border-radius: 12px; background: var(--review-card); cursor: pointer; }
  .htmdx-review-tile:hover { border-color: var(--review-accent); }
  .htmdx-review-tile:focus-visible { outline: 2px solid var(--review-accent); outline-offset: 2px; }
  .htmdx-review-tile-canvas { display: flex; align-items: center; justify-content: center; height: 104px; overflow: hidden; padding: 8px; border-radius: 8px; background: var(--review-frame); }
  .htmdx-review-tile-scale { display: block; zoom: .3; pointer-events: none; }
  .htmdx-review-tile-name { font-size: 13.5px; font-weight: 600; }
  .htmdx-review-nochange { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--review-frame); }
  .htmdx-review-nochange.htmdx-review-nochange.htmdx-review-nochange h4 { margin: 0 0 8px; font-size: 15px; font-weight: 500; }
  .htmdx-review-nochange.htmdx-review-nochange.htmdx-review-nochange ul { margin: 0; padding-left: 18px; }
  .htmdx-review-nochange.htmdx-review-nochange.htmdx-review-nochange li { font-size: 14px; line-height: 1.7; color: var(--review-body); }
  .htmdx-review .htmdx-review-nochange a { color: var(--review-body); text-decoration: none; border-bottom: 1px solid var(--review-line); }
  .htmdx-review .htmdx-review-nochange a:hover { color: var(--review-accent); border-bottom-color: var(--review-accent); }

  .htmdx-review-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 0 8px; margin-bottom: 18px; }
  .htmdx-review-head-text { flex: 1; min-width: 0; }
  .htmdx-review-title.htmdx-review-title.htmdx-review-title { margin: 0; font-size: 32px; font-weight: 500; letter-spacing: -.01em; }
  .htmdx-review-desc.htmdx-review-desc.htmdx-review-desc { max-width: 680px; margin: 8px 0 0; font-size: 15px; line-height: 1.55; color: var(--review-body); }
  .htmdx-review .htmdx-review-head-link { display: inline-flex; gap: 5px; margin-top: 8px; color: var(--review-accent); font-size: 12.5px; font-weight: 600; text-decoration: none; }
  .htmdx-review .htmdx-review-head-link::after { content: '↗'; font-size: 11px; }
  .htmdx-review-context { position: relative; display: block; flex: 0 0 auto; width: 210px; max-width: 100%; height: 150px; padding: 0; overflow: hidden; border: 1px solid var(--review-line); border-radius: 8px; background: var(--review-card); line-height: 0; cursor: zoom-in; }
  .htmdx-review-context:hover { border-color: var(--review-accent); }
  .htmdx-review-context .htmdx-review-shot { position: absolute; left: 0; top: 0; width: 100%; }
  .htmdx-review-context .htmdx-review-shot img { width: 100%; height: auto; }
  .htmdx-review-context-cta { position: absolute; left: 0; right: 0; bottom: 0; padding: 6px 0; border-top: 1px solid var(--review-line); background: rgba(255,255,255,.93); color: var(--review-accent); font-size: 11px; font-weight: 600; line-height: 1; text-align: center; }
  .htmdx-review-context:hover .htmdx-review-context-cta { background: var(--review-accent); color: #fff; }
  .htmdx-review-shot { position: relative; display: inline-block; max-width: 100%; overflow: hidden; }
  .htmdx-review-shot img { display: block; max-width: 100%; height: auto; }
  .htmdx-review-shot.is-big { border: 1px solid var(--review-line); border-radius: 6px; }
  .htmdx-review-shot.is-big img { max-width: 94vw; max-height: 90vh; width: auto; }
  .htmdx-review-ring { position: absolute; border: 2px solid var(--review-accent); border-radius: 4px; box-shadow: 0 0 0 9999px rgba(255,255,255,.55); pointer-events: none; }

  .htmdx-review-panels { display: flex; flex-direction: column; gap: 16px; }
  .htmdx-review-panel { padding: 18px 20px 20px; border: 1px solid var(--review-line); border-radius: 16px; background: var(--review-card); }
  .htmdx-review-panel.is-after { border-color: var(--review-accent-soft); }
  .htmdx-review-panel.is-before { border-style: dashed; background: transparent; }
  .htmdx-review-panel.is-chosen { border: 2px solid var(--review-accent); padding: 17px 19px 19px; }
  .htmdx-review-panel.is-final { border: 2px solid var(--review-final); background: var(--review-final-soft); padding: 17px 19px 19px; }
  .htmdx-review-panel-head { display: flex; align-items: center; gap: 10px; padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid var(--review-frame); }
  .htmdx-review-panel.is-after .htmdx-review-panel-head, .htmdx-review-panel.is-collapsed .htmdx-review-panel-head { cursor: pointer; }
  .htmdx-review-panel.is-after:not(.is-collapsed) .htmdx-review-panel-head { flex-wrap: wrap; }
  .htmdx-review-panel.is-final .htmdx-review-panel-head { border-bottom-color: var(--review-final-line); }
  .htmdx-review-panel.is-before .htmdx-review-panel-head { border-bottom: 0; padding-bottom: 0; margin-bottom: 6px; }
  .htmdx-review-panel.is-collapsed { padding-bottom: 6px; }
  .htmdx-review-panel.is-collapsed .htmdx-review-panel-head { flex-wrap: nowrap; border-bottom: 0; margin-bottom: 0; padding-bottom: 4px; }
  .htmdx-review-panel.is-collapsed .htmdx-review-label { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; min-width: 0; }
  .htmdx-review-fold { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 20px; height: 20px; padding: 0; border: 0; background: none; cursor: pointer; }
  .htmdx-review-caret { width: 7px; height: 7px; border-right: 1.5px solid var(--review-body); border-bottom: 1.5px solid var(--review-body); transform: rotate(45deg); transition: transform .15s ease; }
  .is-collapsed .htmdx-review-caret { transform: rotate(-45deg); }
  .htmdx-review-titles { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 10px; flex: 1 1 220px; min-width: 0; }
  .htmdx-review-caption { flex-shrink: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--review-muted); }
  .htmdx-review-label { font-size: 16px; font-weight: 700; line-height: 1.3; }
  .is-before .htmdx-review-label { color: var(--review-body); }
  .htmdx-review-tag { position: relative; flex-shrink: 0; padding: 3px 8px; border-radius: 9999px; background: var(--review-accent-soft); color: var(--review-accent-ink); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .htmdx-review-tag[data-tip] { cursor: help; }
  .htmdx-review-tag.is-final { padding: 3px 9px; background: var(--review-final); color: #fff; font-weight: 800; letter-spacing: .08em; }
  .htmdx-review-select, .htmdx-review-edit { flex-shrink: 0; padding: 7px 15px; border-radius: 9999px; background: #fff; font-size: 12px; cursor: pointer; transition: background .12s ease, color .12s ease, border-color .12s ease; }
  .htmdx-review-select { border: 1px solid var(--review-accent); color: var(--review-accent); font-weight: 700; }
  .htmdx-review-select:hover { background: var(--review-accent-hover); }
  .htmdx-review-select[aria-pressed="true"] { background: var(--review-accent); color: #fff; }
  .is-before .htmdx-review-select { margin-left: auto; }
  .is-final .htmdx-review-select { border-color: var(--review-final); color: var(--review-final); }
  .is-final .htmdx-review-select[aria-pressed="true"] { background: var(--review-final); color: #fff; }
  .htmdx-review-edit { border: 1px solid var(--review-line); color: var(--review-body); font-weight: 600; }
  .htmdx-review-edit:hover { border-color: var(--review-accent); color: var(--review-accent); background: var(--review-accent-hover); }
  .is-editing .htmdx-review-edit { border-color: var(--review-ink); background: var(--review-ink); color: #fff; }

  .htmdx-review-panel-body { display: flex; flex-direction: column; gap: 14px; }
  .htmdx-review-frame { position: relative; display: flex; justify-content: flex-start; min-width: 0; padding: 12px 24px 30px 12px; overflow-x: auto; }
  .is-before .htmdx-review-frame { margin: -6px 0 0 -12px; }
  .htmdx-review-frame > .htmdx-review-mockup { max-width: 100%; }
  .htmdx-review-aside { display: flex; flex-direction: column; gap: 8px; }
  .htmdx-review-why { font-size: 13.5px; line-height: 1.55; color: var(--review-body); }
  .htmdx-review-why b, .htmdx-review-assumed b { color: var(--review-ink); font-weight: 700; }
  .htmdx-review-more > summary { list-style: none; cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--review-accent); }
  .htmdx-review-more > summary::-webkit-details-marker { display: none; }
  .htmdx-review-more > summary::before { content: '▸ '; }
  .htmdx-review-more[open] > summary::before { content: '▾ '; }
  .htmdx-review-more > :not(summary) { margin-top: 8px; }
  .htmdx-review-assumed { padding: 10px 12px; border-radius: 8px; background: var(--review-frame); font-size: 13px; line-height: 1.5; color: var(--review-body); }
  .htmdx-review-assumed.htmdx-review-assumed.htmdx-review-assumed ul { margin: 5px 0 0; padding-left: 18px; }

  .htmdx-review-pin { position: absolute; z-index: 3; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--review-flag); color: #fff; font-size: 13px; font-weight: 700; box-shadow: 0 0 0 3px var(--review-card); pointer-events: none; }
  .htmdx-review-flag { display: flex; flex-direction: column; gap: 7px; }
  .htmdx-review-flag-head { display: flex; align-items: center; gap: 8px; }
  .htmdx-review-flag-dot { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--review-flag); color: #fff; font-size: 11px; font-weight: 700; }
  .htmdx-review-flag-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: var(--review-flag); }
  .htmdx-review-flag-text { font-size: 13.5px; line-height: 1.55; color: var(--review-flag-text); }

  .htmdx-review-foot { display: flex; justify-content: flex-end; margin-top: 12px; }
  .htmdx-review-switch { display: inline-flex; align-items: center; gap: 8px; color: var(--review-muted); font-size: 11.5px; font-weight: 500; cursor: pointer; user-select: none; }
  .htmdx-review-switch input { position: absolute; width: 1px; height: 1px; margin: 0; opacity: 0; }
  .htmdx-review-track { position: relative; flex-shrink: 0; width: 24px; height: 14px; border-radius: 9999px; background: var(--review-line); transition: background .12s ease; }
  .htmdx-review-track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: transform .12s ease; }
  .htmdx-review-switch input:checked + .htmdx-review-track { background: var(--review-accent); }
  .htmdx-review-switch input:checked + .htmdx-review-track::after { transform: translateX(10px); }
  .htmdx-review-switch input:focus-visible + .htmdx-review-track { outline: 2px solid var(--review-accent); outline-offset: 2px; }

  .htmdx-review-comment { padding-top: 14px; border-top: 1px solid var(--review-frame); }
  .htmdx-review-comment label { display: block; margin-bottom: 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--review-muted); }
  .htmdx-review-comment textarea, .htmdx-review-request textarea { width: 100%; min-height: 56px; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--review-line); border-radius: 10px; background: var(--md-sys-color-surface); color: var(--review-ink); font: inherit; font-size: 14px; line-height: 1.5; resize: vertical; }
  .htmdx-review-comment textarea:focus, .htmdx-review-request textarea:focus { outline: 2px solid var(--review-accent); outline-offset: -1px; background: #fff; }
  .htmdx-review-requests { display: flex; flex-direction: column; gap: 16px; }
  .htmdx-review-request { display: flex; flex-direction: column; gap: 12px; padding: 16px 20px 20px; border: 1.5px dashed var(--review-accent); border-radius: 16px; background: var(--review-card); }
  .htmdx-review-request-head { display: flex; align-items: baseline; gap: 10px; }
  .htmdx-review-request-remove { margin-left: auto; padding: 0 4px; border: 0; background: none; color: var(--review-muted); font-size: 20px; line-height: 1; cursor: pointer; }
  .htmdx-review-request-remove:hover { color: var(--review-ink); }
  .htmdx-review-add { align-self: flex-start; padding: 9px 18px; border: 1.5px dashed var(--review-accent); border-radius: 9999px; background: transparent; color: var(--review-accent); font-size: 13px; font-weight: 600; cursor: pointer; }
  .htmdx-review-add:hover { background: var(--review-accent-hover); }

  .htmdx-review-bar { position: sticky; bottom: 16px; z-index: 20; display: flex; align-items: center; gap: 8px; width: fit-content; max-width: 100%; margin: 4px 0 0 auto; padding: 5px 5px 5px 16px; border-radius: 9999px; background: var(--review-send); color: #fff; box-shadow: 0 4px 16px color-mix(in srgb, var(--review-send) 28%, transparent); }
  .htmdx-review-bar[hidden] { display: none; }
  .htmdx-review-bar-count { font-size: 12.5px; font-weight: 600; white-space: nowrap; }
  .htmdx-review-bar-final { font-weight: 500; color: rgba(255,255,255,.75); }
  .htmdx-review-copy { position: relative; display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border: 0; border-radius: 9999px; background: #fff; color: var(--review-send-ink); font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer; }
  .htmdx-review-copy:hover { background: var(--review-send-soft); }
  .htmdx-review-copy.is-copied { background: var(--review-send-ink); color: #fff; }

  .htmdx-review [data-tip]::after, .htmdx-review [data-tip]::before { position: absolute; z-index: 40; opacity: 0; pointer-events: none; transform: translateY(3px); transition: opacity .08s ease, transform .08s ease; }
  .htmdx-review [data-tip]::after { content: attr(data-tip); bottom: calc(100% + 10px); right: 0; width: max-content; max-width: 280px; padding: 8px 11px; border-radius: 8px; background: var(--review-ink); color: #fff; box-shadow: 0 4px 14px rgba(22,29,29,.22); font-size: 12.5px; font-weight: 500; line-height: 1.45; letter-spacing: 0; text-align: left; text-transform: none; white-space: normal; }
  .htmdx-review [data-tip]::before { content: ''; bottom: calc(100% + 4px); right: 14px; border: 6px solid transparent; border-bottom: 0; border-top-color: var(--review-ink); }
  .htmdx-review [data-tip-align="left"]::after { right: auto; left: 0; }
  .htmdx-review [data-tip-align="left"]::before { right: auto; left: 12px; }
  .htmdx-review [data-tip]:hover::after, .htmdx-review [data-tip]:hover::before, .htmdx-review [data-tip]:focus-visible::after, .htmdx-review [data-tip]:focus-visible::before { opacity: 1; transform: none; }

  .htmdx-review-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 32px; background: rgba(31,26,25,.72); }
  .htmdx-review-overlay.is-zoom { cursor: zoom-out; }
  .htmdx-review-dialog { display: flex; flex-direction: column; gap: 12px; width: min(640px, 92vw); padding: 20px; border-radius: 16px; background: var(--review-card); }
  .htmdx-review-dialog.htmdx-review-dialog.htmdx-review-dialog p { margin: 0; font-size: 14px; font-weight: 600; }
  .htmdx-review-dialog textarea { width: 100%; height: 320px; box-sizing: border-box; padding: 12px; border: 1px solid var(--review-line); border-radius: 10px; font: 13px/1.5 ui-monospace, Menlo, monospace; resize: vertical; }
  .htmdx-review-dialog .htmdx-review-copy { align-self: flex-end; background: var(--review-ink); color: #fff; }

  /* The recreated component answers to its own inline styles and the
     browser's defaults, never to this page's typography. The doubled class
     outranks the document's article rules; inline styles still win. */
  .htmdx-review .htmdx-review-mockup.htmdx-review-mockup { font-family: var(--md-ref-typeface-plain); font-size: 16px; font-weight: 400; line-height: normal; letter-spacing: normal; text-align: left; color: #161d1d; }
  .htmdx-review .htmdx-review-mockup.htmdx-review-mockup :where(*) { all: revert; }
  .htmdx-review .htmdx-review-mockup.htmdx-review-mockup mark.htmdx-review-diff { padding: 1px 2px; border-bottom: 2px solid var(--review-highlight-edge); border-radius: 3px; background: var(--review-highlight); color: inherit; }
  .htmdx-review .htmdx-review-mockup.htmdx-review-mockup mark.htmdx-review-diff-case { padding: 0 1px; border-bottom: 2px dotted var(--review-highlight-edge); background: transparent; color: inherit; }
  .htmdx-review .htmdx-review-mockup.htmdx-review-mockup .htmdx-review-cut::after { content: attr(data-cut); margin: 0 .2em; padding: 0 3px; border-radius: 3px; background: color-mix(in srgb, var(--review-cut) 8%, transparent); color: var(--review-cut); text-decoration: line-through; opacity: .8; }
  .htmdx-review .htmdx-review-mockup.htmdx-review-mockup .htmdx-review-field-editing { border-radius: 2px; outline: 1.5px dashed var(--review-accent); outline-offset: 2px; cursor: text; }
  .htmdx-review .htmdx-review-mockup.htmdx-review-mockup .htmdx-review-field-editing:focus { outline-style: solid; }

  @media (max-width: 1100px) { .htmdx-review-tiles { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
  /* Narrow: no room for a nav column, so it becomes a scrollable strip
     above the page. */
  @media (max-width: 900px) {
    .htmdx-review { flex-direction: column; align-items: stretch; background: var(--review-surface); }
    .htmdx-review-rail { position: sticky; z-index: 25; width: 100%; height: auto; padding: 10px 12px; overflow-x: auto; overflow-y: hidden; background: var(--review-rail); scrollbar-width: none; }
    .htmdx-review-nav { flex-direction: row; align-items: center; gap: 6px; }
    .htmdx-review-nav-group { display: contents; }
    .htmdx-review-nav-heading, .htmdx-review-logo { display: none; }
    .htmdx-review-nav-item { flex-shrink: 0; width: auto; padding: 9px 16px; white-space: nowrap; }
    .htmdx-review-main { padding: 12px 12px 56px; }
    .htmdx-review-hero { margin-bottom: 20px; padding: 28px 24px 32px; }
    .htmdx-review-hero h1 { font-size: 34px; }
    .htmdx-review-section { padding: 14px; border-radius: 20px; }
    .htmdx-review-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .htmdx-review-title.htmdx-review-title.htmdx-review-title { font-size: 24px; }
    .htmdx-review-head { flex-direction: column; padding: 0; }
    .htmdx-review-fact { flex-direction: column; gap: 4px; }
    .htmdx-review-fact-label { flex-basis: auto; padding-top: 0; }
    .htmdx-review-card { padding: 18px 18px; }
    #htmdx-review-overview-index { padding: 20px; }
  }
  /* Phone: the version header's buttons take their own row, and the copy
     pill spans the column. */
  @media (max-width: 600px) {
    .htmdx-review-panel { padding: 14px 14px 16px; }
    .htmdx-review-panel.is-chosen, .htmdx-review-panel.is-final { padding: 13px 13px 15px; }
    .htmdx-review-panel-head { flex-wrap: wrap; }
    .htmdx-review-titles { flex-basis: calc(100% - 34px); }
    .htmdx-review-panel.is-collapsed .htmdx-review-panel-head { flex-wrap: wrap; }
    .htmdx-review-frame { padding: 10px 12px 20px 30px; }
    .is-before .htmdx-review-frame { margin: -6px 0 0 -8px; }
    .htmdx-review-hero h1 { font-size: 28px; }
    .htmdx-review-hero.is-compact { padding: 12px 18px; }
    .htmdx-review-context { width: 100%; }
    .htmdx-review-tiles { grid-template-columns: minmax(0, 1fr); }
    .htmdx-review-bar { width: auto; margin: 16px 0 0; bottom: 8px; }
    .htmdx-review-bar-count { flex: 1; }
  }
`;
