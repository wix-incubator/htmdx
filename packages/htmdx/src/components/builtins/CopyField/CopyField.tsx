import { useContext, type KeyboardEvent, type ReactNode } from 'react';
import { safeHref } from '../../rendering';
import { diffWords } from '../shared/review-diff';
import { ReviewFieldContext } from '../shared/review-context';

// Enter finishes the field: the recreated component decides line breaks, not
// the edit. Keys stay inside the field so a recreated <button> never treats
// Space as a press.
function onEditKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
  event.stopPropagation();
  if (event.key === 'Enter') {
    event.preventDefault();
    event.currentTarget.blur();
  }
}

type CopyFieldProps = { name?: string; href?: string; className?: string } & Record<
  string,
  unknown
>;

// One piece of wording inside a ReviewMockup. Text is always rendered as a
// React text node, never as markup, so neither an agent's wording nor a
// reader's edit can inject HTML into the page.
export function CopyField({ name = '', href, className }: CopyFieldProps) {
  const context = useContext(ReviewFieldContext);
  if (!context) {
    throw new Error('<CopyField> only works inside a <ReviewMockup>');
  }
  const value = context.values[name] ?? '';
  const classes = ['htmdx-review-field', className].filter(Boolean).join(' ');
  // A link whose URL changes between versions: the URL is another field, so
  // each version can point somewhere else.
  const link = (content: ReactNode) => {
    const url = href ? safeHref(context.values[href] ?? '') : null;
    // Styled by the element around it, like the rest of the mockup's text.
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
        className={`${classes} htmdx-review-field-editing`}
        data-field={name}
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

  if (!context.before) {
    return link(
      <span className={classes} data-field={name}>
        {value}
      </span>,
    );
  }

  return link(
    <span className={classes} data-field={name}>
      {diffWords(context.before[name] ?? '', value).map((segment, index) =>
        segment.kind === 'same' ? (
          segment.text
        ) : segment.kind === 'cut' ? (
          // Drawn by CSS from data-cut, so copied text never picks it up.
          <span
            key={index}
            className="htmdx-review-cut"
            data-cut={segment.text}
            title={`Removed: ${segment.text}`}
          />
        ) : (
          <mark
            key={index}
            className={segment.kind === 'changed' ? 'htmdx-review-diff' : 'htmdx-review-diff-case'}
          >
            {segment.text}
          </mark>
        ),
      )}
    </span>,
  );
}
