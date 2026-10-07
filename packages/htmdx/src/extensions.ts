// What an extension script needs to build on the bundled components without a
// build step of its own: the contexts Pages and Variants read their hooks from,
// the creator-kit layout's chrome, and the helpers they use to read their
// source. Reached in the browser as window.Htmdx.extensions.
export {
  PagesExtensionContext,
  VariantsExtensionContext,
  type PageModel,
  type PageStatus,
  type PagesExtension,
  type VariantInfo,
  type VariantsExtension,
} from './components/builtins/shared/variants-context';
export {
  CURRENT,
  readVariants,
  variantAt,
  type VariantModel,
  type VariantRef,
  type VariantsModel,
} from './components/builtins/shared/variants-model';
export { diffWords } from './components/builtins/shared/text-diff';
export { PageChromeContext } from './react/page-chrome';
export { renderInline } from './react/markdown';

import {
  PagesExtensionContext,
  VariantsExtensionContext,
} from './components/builtins/shared/variants-context';
import { CURRENT, readVariants, variantAt } from './components/builtins/shared/variants-model';
import { diffWords } from './components/builtins/shared/text-diff';
import { PageChromeContext } from './react/page-chrome';
import { renderInline } from './react/markdown';

export const extensions = {
  PagesExtensionContext,
  VariantsExtensionContext,
  PageChromeContext,
  CURRENT,
  readVariants,
  variantAt,
  diffWords,
  renderInline,
};
