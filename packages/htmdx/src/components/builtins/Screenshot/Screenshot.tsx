import { useContext, useEffect, useRef, useState } from 'react';
import { safeImageAttributes } from '../../rendering';
import { domAttributes } from '../shared/attributes';
import { PreviewContext, ScreenshotLibrary } from '../shared/variants-context';

type Highlight = { x: number; y: number; w: number; h: number };

type ScreenshotProps = {
  src?: string;
  alt?: string;
  use?: string;
  highlight?: Highlight;
  caption?: string;
  className?: string;
} & Record<string, unknown>;

function isHighlight(value: unknown): value is Highlight {
  return (
    !!value &&
    typeof value === 'object' &&
    ['x', 'y', 'w', 'h'].every((key) => typeof (value as Record<string, unknown>)[key] === 'number')
  );
}

// A screenshot, optionally with one region ringed. With a highlight it is a
// fixed-height thumbnail slid so the region sits in the middle, which keeps a
// tall screen from pushing the page down; either way it opens full size.
export function Screenshot({
  src = '',
  alt = '',
  use = '',
  highlight,
  caption = '',
  className,
  ...props
}: ScreenshotProps) {
  const library = useContext(ScreenshotLibrary);
  const preview = useContext(PreviewContext);
  const [zoomed, setZoomed] = useState(false);
  const thumb = useRef<HTMLButtonElement>(null);
  const shared = use ? library.get(use) : undefined;
  if (use && !shared) {
    throw new Error(`<Screenshot use="${use}">: no screenshot named "${use}" on this page`);
  }
  const image = safeImageAttributes({ src: shared?.src ?? src, alt: shared?.alt ?? alt });
  const ring = isHighlight(highlight) ? highlight : undefined;

  useEffect(() => {
    if (!zoomed) {
      return;
    }
    const onKey = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && setZoomed(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [zoomed]);

  if (preview || !image) {
    return null;
  }

  const fit = () => {
    const box = thumb.current;
    const shot = box?.querySelector<HTMLElement>('.htmdx-shot-frame');
    const img = shot?.querySelector('img');
    const cta = box?.querySelector<HTMLElement>('.htmdx-shot-cta');
    if (!box || !shot || !img || !ring || !img.offsetHeight) {
      return;
    }
    const view = box.clientHeight - (cta?.offsetHeight ?? 0);
    const height = img.offsetHeight;
    const top = (ring.y / 100) * height;
    const size = (ring.h / 100) * height;
    const offset = size > view ? top - 8 : top + size / 2 - view / 2;
    shot.style.top = `${-Math.max(0, Math.min(offset, height - view))}px`;
  };
  const ringElement = ring && (
    <span
      className="htmdx-shot-ring"
      style={{ left: `${ring.x}%`, top: `${ring.y}%`, width: `${ring.w}%`, height: `${ring.h}%` }}
    />
  );

  return (
    <>
      <button
        {...domAttributes(props)}
        ref={thumb}
        type="button"
        data-htmdx-component="Screenshot"
        className={['htmdx-shot', ring ? 'is-thumbnail' : 'is-full', className]
          .filter(Boolean)
          .join(' ')}
        title="Open full size"
        onClick={() => setZoomed(true)}
      >
        <span className="htmdx-shot-frame">
          <img src={image.src} alt={image.alt} onLoad={fit} />
          {ringElement}
        </span>
        {ring && <span className="htmdx-shot-cta">{caption || 'View in context'} ⤢</span>}
      </button>
      {zoomed && (
        <div
          className="htmdx-shot-overlay"
          role="dialog"
          aria-label={image.alt}
          onClick={() => setZoomed(false)}
        >
          <span className="htmdx-shot-frame is-big">
            <img src={image.src} alt={image.alt} />
            {ringElement}
          </span>
        </div>
      )}
    </>
  );
}

export const screenshotStyles = `
  .htmdx-shot { position: relative; display: block; max-width: 100%; padding: 0; overflow: hidden; border: 1px solid var(--md-sys-color-outline-variant); border-radius: 8px; background: var(--md-sys-color-surface); line-height: 0; cursor: zoom-in; }
  .htmdx-shot:hover { border-color: var(--md-sys-color-primary); }
  .htmdx-shot.is-thumbnail { flex: 0 0 auto; width: 210px; height: 150px; }
  .htmdx-shot-frame { position: relative; display: inline-block; max-width: 100%; overflow: hidden; }
  .htmdx-shot-frame img { display: block; max-width: 100%; height: auto; }
  .htmdx-shot.is-thumbnail .htmdx-shot-frame { position: absolute; left: 0; top: 0; width: 100%; }
  .htmdx-shot.is-thumbnail .htmdx-shot-frame img { width: 100%; }
  .htmdx-shot-cta { position: absolute; left: 0; right: 0; bottom: 0; padding: 6px 0; border-top: 1px solid var(--md-sys-color-outline-variant); background: rgba(255,255,255,.93); color: var(--md-sys-color-primary); font-size: 11px; font-weight: 600; line-height: 1; text-align: center; }
  .htmdx-shot:hover .htmdx-shot-cta { background: var(--md-sys-color-primary); color: var(--md-sys-color-on-primary); }
  /* A ring, not a fill: the point is to find the region, and a tint over it
     changes the colours of the very thing being looked at. */
  .htmdx-shot-ring { position: absolute; border: 2px solid var(--md-sys-color-primary); border-radius: 4px; box-shadow: 0 0 0 9999px rgba(255,255,255,.55); pointer-events: none; }
  .htmdx-shot-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 32px; background: rgba(31,26,25,.72); cursor: zoom-out; }
  .htmdx-shot-frame.is-big { border: 1px solid var(--md-sys-color-outline-variant); border-radius: 6px; }
  .htmdx-shot-frame.is-big img { max-width: 94vw; max-height: 90vh; width: auto; }
  @media (max-width: 600px) { .htmdx-shot.is-thumbnail { width: 100%; } }
`;
