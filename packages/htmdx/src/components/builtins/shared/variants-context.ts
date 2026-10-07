import { createContext, type ReactNode } from 'react';
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
export type VariantsExtension = {
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

export type PageStatus = 'selected' | 'final' | null;
export type PageModel = { key: string; title: string; variants: VariantsModel[] };

// A component wrapping Pages can mark each page in the nav and on its overview
// tile, such as whether the reader has picked something on it.
export type PagesExtension = {
  status?: (page: PageModel) => PageStatus;
};

export const PagesExtensionContext = createContext<PagesExtension | null>(null);

// Screenshots declared once on a Pages and reused by name on its pages, so a
// screen several pages sit on is embedded once.
export const ScreenshotLibrary = createContext<ReadonlyMap<string, { src: string; alt: string }>>(
  new Map(),
);
