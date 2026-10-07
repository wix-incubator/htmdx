import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { VariantModel, VariantRef, VariantsModel } from './variants-model';

// What a template's TextSlots show. Variants renders the same template once
// per variant, each under its own values.
export type SlotContextValue = {
  values: Record<string, string>;
  // The current text to diff against; undefined draws the text unmarked.
  before?: Record<string, string>;
  // While editing, slots become editable text and report each change.
  onEdit?: (slot: string, text: string) => void;
};

export const SlotContext = createContext<SlotContextValue | null>(null);

// Inside a Pages overview tile, components draw a small preview of themselves
// (Variants shows only its current variant) or nothing.
export const PreviewContext = createContext(false);

export type VariantInfo = { variants: VariantsModel; variant: VariantModel; ref: VariantRef };

// Hooks for a component that wraps Variants and lets readers act on them, such
// as picking a variant or rewording it. Every hook is optional; without a
// provider, Variants is a read-only comparison.
export type VariantsExtension = ExtensionStore & {
  /** Controls at the end of a variant's header. */
  actions?: (info: VariantInfo) => ReactNode;
  /** Extra tags after the variant's label. */
  tags?: (info: VariantInfo) => ReactNode;
  /** Content under the variant's Why, such as a comment box. */
  below?: (info: VariantInfo) => ReactNode;
  /** Content after the last variant, such as requests for another one. */
  after?: (variants: VariantsModel) => ReactNode;
  /** Highlights the variant as the reader's current pick, and opens it. */
  selected?: (info: VariantInfo) => boolean;
  /** Slot text to show instead of the authored text, such as unsent edits. */
  overrides?: (info: VariantInfo) => Record<string, string> | undefined;
  /** Makes the variant's slots editable in place while it returns a handler. */
  editing?: (info: VariantInfo) => ((slot: string, text: string) => void) | undefined;
};

export const VariantsExtensionContext = createContext<VariantsExtension | null>(null);

// Either kind of extension can tell the components to draw again, e.g. when
// the reader's decisions change: `subscribe` registers a listener, and
// `getSnapshot` returns a value that changes whenever the hooks would return
// something new.
export type ExtensionStore = {
  subscribe?: (onChange: () => void) => () => void;
  getSnapshot?: () => unknown;
};

export type PageStatus = 'selected' | 'final' | null;
export type PageModel = { key: string; title: string; variants: VariantsModel[] };

export type PagesInfo = {
  /** The Pages' own `name`. */
  name: string;
  /** Its data-* attributes, by name without the prefix: data-revision -> revision. */
  data: Record<string, string>;
  pages: PageModel[];
};

// A component wrapping Pages, or a script through registerExtension, can mark
// each page in the nav and on its overview tile, such as whether the reader has
// picked something on it, and add UI of its own after the pages.
export type PagesExtension = ExtensionStore & {
  status?: (page: PageModel, info: PagesInfo) => PageStatus;
  /** UI after the pages, on the overview and on every page. */
  after?: (info: PagesInfo) => ReactNode;
};

export const PagesExtensionContext = createContext<PagesExtension | null>(null);

// Screenshots declared once on a Pages and reused by name on its pages, so a
// screen several pages sit on is embedded once.
export const ScreenshotLibrary = createContext<ReadonlyMap<string, { src: string; alt: string }>>(
  new Map(),
);

// Extensions registered by a script rather than a wrapping component. A
// wrapping component's context takes precedence.
const registered: { pages: PagesExtension | null; variants: VariantsExtension | null } = {
  pages: null,
  variants: null,
};

export function setRegisteredExtensions(extensions: {
  pages?: PagesExtension;
  variants?: VariantsExtension;
}) {
  registered.pages = extensions.pages ?? registered.pages;
  registered.variants = extensions.variants ?? registered.variants;
}

const noSubscription = () => () => {};
const noSnapshot = () => 0;

function useStore<T extends ExtensionStore>(extension: T | null) {
  useSyncExternalStore(
    extension?.subscribe ?? noSubscription,
    extension?.getSnapshot ?? noSnapshot,
    extension?.getSnapshot ?? noSnapshot,
  );
  return extension;
}

export function usePagesExtension() {
  return useStore(useContext(PagesExtensionContext) ?? registered.pages);
}

export function useVariantsExtension() {
  return useStore(useContext(VariantsExtensionContext) ?? registered.variants);
}
