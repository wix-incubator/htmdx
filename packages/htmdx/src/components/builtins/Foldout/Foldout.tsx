import type { ReactNode } from 'react';
import { InlineMarkdown, StructuredBlock } from '../shared/structured';

type FoldoutProps = {
  title?: string;
  open?: boolean;
  className?: string;
  children?: ReactNode;
} & Record<string, unknown>;

export function Foldout({ title = '', open, className, children, ...attributes }: FoldoutProps) {
  return (
    <StructuredBlock name="Foldout" className={className} {...attributes}>
      <details open={open} className="group w-full overflow-hidden rounded-lg border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="font-bold text-card-foreground">
            <InlineMarkdown text={title} />
          </span>
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] transition-transform group-open:rotate-180"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </summary>
        <div className="border-t px-4 py-3 text-sm text-card-foreground">{children}</div>
      </details>
    </StructuredBlock>
  );
}
