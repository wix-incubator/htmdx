import { diffWords } from './text-diff';

// Text with the changes from `before` marked: a filled mark for new wording,
// an underline for a capitalization change, and a struck-through trace where
// words were cut. Always plain text nodes, never markup.
export function DiffMarks({ before, after }: { before: string; after: string }) {
  return (
    <>
      {diffWords(before, after).map((segment, index) =>
        segment.kind === 'same' ? (
          segment.text
        ) : segment.kind === 'cut' ? (
          // Drawn by CSS from data-cut, so copied text never picks it up.
          <span
            key={index}
            className="htmdx-diff-cut"
            data-cut={segment.text}
            title={`Removed: ${segment.text}`}
          />
        ) : (
          <mark
            key={index}
            className={segment.kind === 'changed' ? 'htmdx-diff' : 'htmdx-diff-case'}
          >
            {segment.text}
          </mark>
        ),
      )}
    </>
  );
}

export const diffMarkStyles = `
  mark.htmdx-diff { padding: 1px 2px; border-bottom: 2px solid #e8b900; border-radius: 3px; background: rgba(232, 185, 0, .22); color: inherit; }
  mark.htmdx-diff-case { padding: 0 1px; border-bottom: 2px dotted #e8b900; background: transparent; color: inherit; }
  .htmdx-diff-cut::after { content: attr(data-cut); margin: 0 .2em; padding: 0 3px; border-radius: 3px; background: rgba(179, 38, 30, .08); color: #b3261e; text-decoration: line-through; opacity: .8; }
`;
