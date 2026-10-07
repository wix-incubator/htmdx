import { useContext, type KeyboardEvent, type ReactNode } from 'react';
import { safeHref } from '../../rendering';
import { DiffMarks } from '../shared/diff-marks';
import { SlotContext } from '../shared/variants-context';

// Enter finishes the slot: the template decides line breaks, not the edit.
// Keys stay inside the slot so a templated <button> never treats Space as a
// press.
function onEditKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
  event.stopPropagation();
  if (event.key === 'Enter') {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

type TextSlotProps = { name?: string; href?: string; className?: string } & Record<string, unknown>;

// One piece of text inside a VariantTemplate. Text is always rendered as a
// React text node, never as markup, so neither an author's text nor a
// reader's edit can inject HTML into the page.
export function TextSlot({ name = '', href, className }: TextSlotProps) {
  const context = useContext(SlotContext);
  if (!context) {
    throw new Error('<TextSlot> only works inside a <VariantTemplate>');
  }
  const value = context.values[name] ?? '';
  const classes = ['htmdx-variants-slot', className].filter(Boolean).join(' ');
  // A link whose URL changes between variants: the URL is another slot, so
  // each variant can point somewhere else.
  const link = (content: ReactNode) => {
    const url = href ? safeHref(context.values[href] ?? '') : null;
    // Styled by the element around it, like the rest of the template's text.
    return url ? (
      <a href={url} style={{ color: 'inherit', textDecoration: 'inherit' }}>
        {content}
      </a>
    ) : (
      content
    );
  };

  const { onEdit } = context;
  if (onEdit) {
    return link(
      <span
        className={`${classes} is-editing`}
        data-text-slot={name}
        contentEditable="plaintext-only"
        suppressContentEditableWarning
        spellCheck
        onKeyDown={onEditKeyDown}
        onKeyUp={(event) => event.preventDefault()}
        onInput={(event) =>
          onEdit(name, (event.currentTarget.textContent || '').replace(/\s+/g, ' ').trim())
        }
      >
        {value}
      </span>,
    );
  }

  return link(
    <span className={classes} data-text-slot={name}>
      {context.before ? <DiffMarks before={context.before[name] ?? ''} after={value} /> : value}
    </span>,
  );
}
