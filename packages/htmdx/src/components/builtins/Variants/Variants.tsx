import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { domAttributes } from '../shared/attributes';
import { InlineMarkdown } from '../shared/structured';
import { diffWords } from '../shared/text-diff';
import {
  PreviewContext,
  SlotContext,
  useVariantsExtension,
  type VariantInfo,
} from '../shared/variants-context';
import {
  CURRENT,
  readVariants,
  type VariantModel,
  type VariantsModel,
} from '../shared/variants-model';

type VariantsProps = {
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>;

// One piece of UI drawn once per variant, each with its own text, and every
// variant word-diffed against the current one. A component that wraps it can
// let readers act on the variants through VariantsExtensionContext.
export function Variants({ className, ...props }: VariantsProps) {
  const model = useMemo(() => readVariants(props), [props]);
  const attributes = domAttributes(props);
  const preview = useContext(PreviewContext);
  const extension = useVariantsExtension();
  const first = model.current ?? model.variants[0];

  // In an overview tile, only the current variant, as a thumbnail of the page.
  if (preview) {
    return <Template variant={first} />;
  }

  const ordered: VariantModel[] = [...model.variants];
  // A chosen variant is the thing to read, so it moves straight under the
  // current one, which stays on top as the reference it is read against.
  if (typeof model.chosen === 'number') {
    ordered.unshift(...ordered.splice(model.chosen, 1));
  }
  const settled = model.chosen !== null;
  return (
    <section
      {...attributes}
      data-htmdx-component="Variants"
      className={['htmdx-component htmdx-variants', className].filter(Boolean).join(' ')}
    >
      {model.current && (
        <Panel model={model} variant={model.current} folded={settled && model.chosen !== CURRENT} />
      )}
      {ordered.map((variant) => (
        <Panel
          key={String(variant.ref)}
          model={model}
          variant={variant}
          folded={settled && model.chosen !== variant.ref}
        />
      ))}
      {extension?.after?.(model)}
    </section>
  );
}

// The template sits in a wrapper that resets the document's own typography,
// so its text wraps the way it will in the product rather than the way this
// page styles its headings and paragraphs.
function Template({
  variant,
  values = variant.values,
  before,
  onEdit,
}: {
  variant: VariantModel;
  values?: Record<string, string>;
  before?: Record<string, string>;
  onEdit?: (slot: string, text: string) => void;
}) {
  return (
    <SlotContext.Provider value={{ values, before, onEdit }}>
      <div className="htmdx-variants-template">{variant.template}</div>
    </SlotContext.Provider>
  );
}

// Only the first sentence of a Why stays visible; the rest is detail for when
// the reader doubts it.
function splitWhy(why: string) {
  const match = why.match(/^(.+?[.!?])\s+(?=[A-Z"“(])/);
  return match
    ? { lead: match[1], rest: why.slice(match[0].length).trim() }
    : { lead: why, rest: '' };
}

function Panel({
  model,
  variant,
  folded,
}: {
  model: VariantsModel;
  variant: VariantModel;
  folded: boolean;
}) {
  const extension = useVariantsExtension();
  const { ref } = variant;
  const info: VariantInfo = { variants: model, variant, ref };
  const isCurrent = ref === CURRENT;
  const isChosen = model.chosen === ref;
  const selected = !!extension?.selected?.(info);
  const [open, setOpen] = useState(!folded);
  const [marks, setMarks] = useState(true);
  // Selecting a folded variant opens it.
  useEffect(() => {
    if (selected) {
      setOpen(true);
    }
  }, [selected]);

  const values = { ...variant.values, ...extension?.overrides?.(info) };
  // While editing, the template keeps the text it started with, so typing is
  // never re-rendered underneath the caret.
  const onEdit = open ? extension?.editing?.(info) : undefined;
  const editStart = useRef<Record<string, string> | null>(null);
  if (onEdit && !editStart.current) {
    editStart.current = values;
  } else if (!onEdit) {
    editStart.current = null;
  }

  // Slots this variant added have no current text to diff against, so they
  // mark as wholly new; a replaced template is a different thing and is not
  // marked.
  const current = model.current;
  const diffable = !isCurrent && !variant.replaced && current;
  const hasMarks =
    !!diffable &&
    Object.entries(values).some(([slot, value]) =>
      diffWords(current!.values[slot] ?? '', value).some((segment) => segment.kind !== 'same'),
    );
  const caption = isCurrent ? 'Before' : `Version ${(ref as number) + 1}`;
  const label = isCurrent
    ? 'Current text'
    : variant.label.replace(/^\s*(option|version)\s*\d+\s*[—–:.-]?\s*/i, '') || 'Suggested text';
  const foldable = !isCurrent || folded;
  const why = splitWhy(variant.why);
  const more = why.rest || variant.assumptions.length > 0 || variant.sourced;
  const flagged = isCurrent && !!model.flag;

  return (
    <article
      className={[
        'htmdx-variants-panel',
        isCurrent ? 'is-current' : 'is-variant',
        selected && 'is-selected',
        isChosen && 'is-chosen',
        !open && 'is-collapsed',
        onEdit && 'is-editing',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className="htmdx-variants-head"
        // The whole head folds the panel, except the controls inside it.
        onClick={(event) => {
          if (foldable && !(event.target as Element).closest('button, label')) {
            setOpen(!open);
          }
        }}
      >
        {foldable && (
          <button
            type="button"
            className="htmdx-variants-fold"
            aria-expanded={open}
            title={open ? 'Collapse this version' : 'Expand this version'}
            onClick={() => setOpen(!open)}
          >
            <span className="htmdx-variants-caret" />
          </button>
        )}
        <span className="htmdx-variants-titles">
          <span className="htmdx-variants-caption">{caption}</span>
          <span className="htmdx-variants-label">{label}</span>
          {isChosen && <span className="htmdx-variants-tag is-chosen">{model.chosenLabel}</span>}
          {variant.badge && !isChosen && (
            <span
              className="htmdx-variants-tag"
              tabIndex={variant.badgeTip ? 0 : undefined}
              data-tip={variant.badgeTip || undefined}
              data-tip-align="left"
            >
              {variant.badge}
            </span>
          )}
          {extension?.tags?.(info)}
        </span>
        {open && extension?.actions?.(info)}
      </div>
      {open && (
        <div className="htmdx-variants-body">
          <div
            className="htmdx-variants-frame"
            // Links and buttons in a template never navigate or submit: it is a
            // picture of the component, not the component.
            onClickCapture={(event) => {
              if ((event.target as Element).closest?.('a, button, [role="button"]')) {
                event.preventDefault();
              }
            }}
          >
            {onEdit ? (
              <Template variant={variant} values={editStart.current!} onEdit={onEdit} />
            ) : (
              <Template
                variant={variant}
                values={values}
                before={diffable && marks ? current!.values : undefined}
              />
            )}
            {flagged && <FlagPin anchor={model.flagAnchor} />}
          </div>
          {flagged && (
            <div className="htmdx-variants-flag">
              <div className="htmdx-variants-flag-head">
                <span className="htmdx-variants-flag-dot">!</span>
                <span className="htmdx-variants-flag-label">{model.flagLabel}</span>
              </div>
              <div className="htmdx-variants-flag-text">
                <InlineMarkdown text={model.flag} />
              </div>
            </div>
          )}
          {(why.lead || more) && (
            <div className="htmdx-variants-aside">
              {why.lead && (
                <div className="htmdx-variants-why">
                  <b>Why:</b> <InlineMarkdown text={why.lead} />
                </div>
              )}
              {more && (
                <details className="htmdx-variants-more">
                  <summary>Read more</summary>
                  {why.rest && (
                    <div className="htmdx-variants-why">
                      <InlineMarkdown text={why.rest} />
                    </div>
                  )}
                  {variant.assumptions.length > 0 && (
                    <div className="htmdx-variants-assumed">
                      <b>Assumed:</b>
                      <ul>
                        {variant.assumptions.map((assumption) => (
                          <li key={assumption}>
                            <InlineMarkdown text={assumption} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {variant.sourced && (
                    <div className="htmdx-variants-why">
                      <b>Where this came from:</b> <InlineMarkdown text={variant.sourced} />
                    </div>
                  )}
                </details>
              )}
            </div>
          )}
          {extension?.below?.(info)}
        </div>
      )}
      {open && hasMarks && !onEdit && (
        <div className="htmdx-variants-foot">
          <label
            className="htmdx-variants-switch"
            title="Turn off to read this version without highlights and strikethroughs"
          >
            <input type="checkbox" checked={marks} onChange={() => setMarks(!marks)} />
            <span className="htmdx-variants-track" aria-hidden="true" />
            <span>Highlight changes</span>
          </label>
        </div>
      )}
    </article>
  );
}

// A pin on the slot a flag is about, placed by measurement so it never
// reflows the template and changes how its text wraps.
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
        ? [...frame.querySelectorAll<HTMLElement>('[data-text-slot]')].find(
            (slot) => slot.dataset.textSlot === anchor,
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
    // compile() renders where effects run but there is no window.
    const win = globalThis.window;
    win?.addEventListener('resize', place);
    void globalThis.document?.fonts?.ready.then(place);
    return () => win?.removeEventListener('resize', place);
  }, [anchor]);
  return (
    <span ref={pin} className="htmdx-variants-pin" aria-hidden="true">
      !
    </span>
  );
}

// Colours that are not the page theme's are variables, so a host can set its
// own on the tag: class="[--variants-chosen:#1e6b43]".
export const variantsStyles = `
  .htmdx-variants {
    --variants-accent: var(--md-sys-color-primary);
    --variants-accent-ink: var(--md-sys-color-on-primary-container);
    --variants-accent-soft: var(--md-sys-color-primary-container);
    --variants-ink: var(--md-sys-color-on-surface);
    --variants-body: var(--md-sys-color-on-surface-variant);
    --variants-muted: #a1a1aa;
    --variants-line: var(--md-sys-color-outline-variant);
    --variants-card: var(--md-sys-color-surface-container-lowest, #fff);
    --variants-frame: var(--md-sys-color-surface-container-low);
    --variants-chosen: #2e7d4f;
    --variants-chosen-soft: #f2f9f4;
    --variants-chosen-line: #dcefe2;
    --variants-flag: #2f5d6b;
    --variants-flag-text: #3f5460;
    display: flex; flex-direction: column; gap: 16px; padding: 24px; border-radius: 28px; background: var(--variants-frame); color: var(--variants-ink);
  }
  .htmdx-variants button { font-family: inherit; }
  .htmdx-variants ul { list-style: disc; }
  .htmdx-variants-panel { padding: 18px 20px 20px; border: 1px solid var(--variants-line); border-radius: 16px; background: var(--variants-card); }
  .htmdx-variants-panel.is-variant { border-color: var(--variants-accent-soft); }
  .htmdx-variants-panel.is-current { border-style: dashed; background: transparent; }
  .htmdx-variants-panel.is-selected { border: 2px solid var(--variants-accent); padding: 17px 19px 19px; }
  .htmdx-variants-panel.is-chosen { border: 2px solid var(--variants-chosen); background: var(--variants-chosen-soft); padding: 17px 19px 19px; }
  .htmdx-variants-head { display: flex; align-items: center; gap: 10px; padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid var(--variants-frame); }
  .htmdx-variants-panel.is-variant .htmdx-variants-head, .htmdx-variants-panel.is-collapsed .htmdx-variants-head { cursor: pointer; }
  .htmdx-variants-panel.is-variant:not(.is-collapsed) .htmdx-variants-head { flex-wrap: wrap; }
  .htmdx-variants-panel.is-chosen .htmdx-variants-head { border-bottom-color: var(--variants-chosen-line); }
  .htmdx-variants-panel.is-current .htmdx-variants-head { border-bottom: 0; padding-bottom: 0; margin-bottom: 6px; }
  .htmdx-variants-panel.is-collapsed { padding-bottom: 6px; }
  .htmdx-variants-panel.is-collapsed .htmdx-variants-head { flex-wrap: nowrap; border-bottom: 0; margin-bottom: 0; padding-bottom: 4px; }
  .htmdx-variants-panel.is-collapsed .htmdx-variants-label { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; min-width: 0; }
  .htmdx-variants-fold { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 20px; height: 20px; padding: 0; border: 0; background: none; cursor: pointer; }
  .htmdx-variants-caret { width: 7px; height: 7px; border-right: 1.5px solid var(--variants-body); border-bottom: 1.5px solid var(--variants-body); transform: rotate(45deg); transition: transform .15s ease; }
  .is-collapsed .htmdx-variants-caret { transform: rotate(-45deg); }
  .htmdx-variants-titles { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px 10px; flex: 1 1 220px; min-width: 0; }
  .htmdx-variants-caption { flex-shrink: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--variants-muted); }
  .htmdx-variants-label { font-size: 16px; font-weight: 700; line-height: 1.3; }
  .is-current .htmdx-variants-label { color: var(--variants-body); }
  .htmdx-variants-tag { position: relative; flex-shrink: 0; padding: 3px 8px; border-radius: 9999px; background: var(--variants-accent-soft); color: var(--variants-accent-ink); font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
  .htmdx-variants-tag.is-chosen { padding: 3px 9px; background: var(--variants-chosen); color: #fff; font-weight: 800; letter-spacing: .08em; }
  .htmdx-variants-tag[data-tip] { cursor: help; }
  .htmdx-variants-tag[data-tip]::after { content: attr(data-tip); position: absolute; bottom: calc(100% + 10px); left: 0; z-index: 40; width: max-content; max-width: 280px; padding: 8px 11px; border-radius: 8px; background: var(--variants-ink); color: #fff; font-size: 12.5px; font-weight: 500; line-height: 1.45; letter-spacing: 0; text-transform: none; white-space: normal; opacity: 0; pointer-events: none; transition: opacity .08s ease; }
  .htmdx-variants-tag[data-tip]:hover::after, .htmdx-variants-tag[data-tip]:focus-visible::after { opacity: 1; }

  .htmdx-variants-body { display: flex; flex-direction: column; gap: 14px; }
  .htmdx-variants-frame { position: relative; display: flex; justify-content: flex-start; min-width: 0; padding: 12px 24px 30px 12px; overflow-x: auto; }
  .is-current .htmdx-variants-frame { margin: -6px 0 0 -12px; }
  .htmdx-variants-frame > .htmdx-variants-template { max-width: 100%; }
  .htmdx-variants-aside { display: flex; flex-direction: column; gap: 8px; }
  .htmdx-variants-why { font-size: 13.5px; line-height: 1.55; color: var(--variants-body); }
  .htmdx-variants-why b, .htmdx-variants-assumed b { color: var(--variants-ink); font-weight: 700; }
  .htmdx-variants-more > summary { list-style: none; cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--variants-accent); }
  .htmdx-variants-more > summary::-webkit-details-marker { display: none; }
  .htmdx-variants-more > summary::before { content: '▸ '; }
  .htmdx-variants-more[open] > summary::before { content: '▾ '; }
  .htmdx-variants-more > :not(summary) { margin-top: 8px; }
  .htmdx-variants-assumed { padding: 10px 12px; border-radius: 8px; background: var(--variants-frame); font-size: 13px; line-height: 1.5; color: var(--variants-body); }
  .htmdx-variants-assumed.htmdx-variants-assumed.htmdx-variants-assumed ul { margin: 5px 0 0; padding-left: 18px; }

  .htmdx-variants-pin { position: absolute; z-index: 3; display: flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: var(--variants-flag); color: #fff; font-size: 13px; font-weight: 700; box-shadow: 0 0 0 3px var(--variants-card); pointer-events: none; }
  .htmdx-variants-flag { display: flex; flex-direction: column; gap: 7px; }
  .htmdx-variants-flag-head { display: flex; align-items: center; gap: 8px; }
  .htmdx-variants-flag-dot { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; background: var(--variants-flag); color: #fff; font-size: 11px; font-weight: 700; }
  .htmdx-variants-flag-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: var(--variants-flag); }
  .htmdx-variants-flag-text { font-size: 13.5px; line-height: 1.55; color: var(--variants-flag-text); }

  .htmdx-variants-foot { display: flex; justify-content: flex-end; margin-top: 12px; }
  .htmdx-variants-switch { display: inline-flex; align-items: center; gap: 8px; color: var(--variants-muted); font-size: 11.5px; font-weight: 500; cursor: pointer; user-select: none; }
  .htmdx-variants-switch input { position: absolute; width: 1px; height: 1px; margin: 0; opacity: 0; }
  .htmdx-variants-track { position: relative; flex-shrink: 0; width: 24px; height: 14px; border-radius: 9999px; background: var(--variants-line); transition: background .12s ease; }
  .htmdx-variants-track::after { content: ''; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.2); transition: transform .12s ease; }
  .htmdx-variants-switch input:checked + .htmdx-variants-track { background: var(--variants-accent); }
  .htmdx-variants-switch input:checked + .htmdx-variants-track::after { transform: translateX(10px); }
  .htmdx-variants-switch input:focus-visible + .htmdx-variants-track { outline: 2px solid var(--variants-accent); outline-offset: 2px; }

  /* The template answers to its own inline styles and the browser's
     defaults, never to this page's typography. The doubled class outranks
     the document's article rules; inline styles still win. Tiles reuse it. */
  .htmdx-variants-template.htmdx-variants-template { font-family: var(--md-ref-typeface-plain); font-size: 16px; font-weight: 400; line-height: normal; letter-spacing: normal; text-align: left; color: #161d1d; }
  .htmdx-variants-template.htmdx-variants-template :where(*) { all: revert; }
  .htmdx-variants-template.htmdx-variants-template mark.htmdx-diff { padding: 1px 2px; border-bottom: 2px solid #e8b900; border-radius: 3px; background: rgba(232, 185, 0, .22); color: inherit; }
  .htmdx-variants-template.htmdx-variants-template mark.htmdx-diff-case { padding: 0 1px; border-bottom: 2px dotted #e8b900; background: transparent; color: inherit; }
  .htmdx-variants-template.htmdx-variants-template .htmdx-diff-cut::after { content: attr(data-cut); margin: 0 .2em; padding: 0 3px; border-radius: 3px; background: rgba(179, 38, 30, .08); color: #b3261e; text-decoration: line-through; opacity: .8; }
  .htmdx-variants-template.htmdx-variants-template .htmdx-variants-slot.is-editing { border-radius: 2px; outline: 1.5px dashed var(--variants-accent, currentColor); outline-offset: 2px; cursor: text; }
  .htmdx-variants-template.htmdx-variants-template .htmdx-variants-slot.is-editing:focus { outline-style: solid; }

  @media (max-width: 960px) { .htmdx-variants { padding: 14px; border-radius: 20px; } }
  /* Phone: a variant's header controls take their own row. */
  @media (max-width: 600px) {
    .htmdx-variants-panel { padding: 14px 14px 16px; }
    .htmdx-variants-panel.is-selected, .htmdx-variants-panel.is-chosen { padding: 13px 13px 15px; }
    .htmdx-variants-head, .htmdx-variants-panel.is-collapsed .htmdx-variants-head { flex-wrap: wrap; }
    .htmdx-variants-titles { flex-basis: calc(100% - 34px); }
    .htmdx-variants-frame { padding: 10px 12px 20px 30px; }
    .is-current .htmdx-variants-frame { margin: -6px 0 0 -8px; }
  }
`;
