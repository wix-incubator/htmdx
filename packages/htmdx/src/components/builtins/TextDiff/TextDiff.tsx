import type { HTMLAttributes } from 'react';
import { DiffMarks } from '../shared/diff-marks';

type TextDiffProps = {
  before?: string;
  after?: string;
  className?: string;
} & Record<string, unknown>;

// The after text with what changed from the before text marked: rewrites,
// capitalization changes and cuts each look different, and phrases that
// changed together read as one mark.
export function TextDiff({ before = '', after = '', className, ...attributes }: TextDiffProps) {
  return (
    <span
      {...(attributes as HTMLAttributes<HTMLSpanElement>)}
      data-htmdx-component="TextDiff"
      className={['htmdx-text-diff', className].filter(Boolean).join(' ')}
    >
      <DiffMarks before={before} after={after} />
    </span>
  );
}
