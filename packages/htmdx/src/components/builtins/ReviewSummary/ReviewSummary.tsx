import type { HTMLAttributes } from 'react';
import { InlineMarkdown } from '../shared/structured';

type ReviewSummaryProps = {
  whatItIs?: string;
  audience?: string;
  assumptionsNote?: string;
  body?: string;
  className?: string;
} & Record<string, unknown>;

type Assumption = { claim: string; points: string[] };

const DEFAULT_NOTE =
  'Taken from the code and from your answers. If any is wrong, say so before reading the options: every one of them was written on top of these.';

// `- claim` rows, each with optional indented `- point` rows under it, for a
// claim that contains a list.
function parseAssumptions(body: string): Assumption[] {
  const assumptions: Assumption[] = [];
  for (const line of body.split('\n')) {
    const match = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (!match) {
      continue;
    }
    const nested = match[1].length > 0 && assumptions.length > 0;
    if (nested) {
      assumptions[assumptions.length - 1].points.push(match[2].trim());
    } else {
      assumptions.push({ claim: match[2].trim(), points: [] });
    }
  }
  return assumptions;
}

// What the review understood the feature to be, and what it took as true.
// Two cards, because they answer different questions: a reader who agrees
// with the first still has to check the second. Both sit above the elements,
// so a wrong premise is caught before any wording is read.
export function ReviewSummary({
  whatItIs = '',
  audience = '',
  assumptionsNote = '',
  body = '',
  className,
  ...attributes
}: ReviewSummaryProps) {
  const facts = [
    ['What it is', whatItIs],
    ['Audience', audience],
  ].filter(([, value]) => value);
  const assumptions = parseAssumptions(body);
  return (
    <section
      {...(attributes as HTMLAttributes<HTMLElement>)}
      data-htmdx-component="ReviewSummary"
      className={['htmdx-component htmdx-review-summary', className].filter(Boolean).join(' ')}
    >
      {facts.length > 0 && (
        <div className="htmdx-review-card">
          <h3>About this feature</h3>
          {facts.map(([label, value]) => (
            <div key={label} className="htmdx-review-fact">
              <div className="htmdx-review-fact-label">{label}</div>
              <div className="htmdx-review-fact-value">
                <InlineMarkdown text={value} />
              </div>
            </div>
          ))}
        </div>
      )}
      {assumptions.length > 0 && (
        <div className="htmdx-review-card">
          <h3>Assumptions</h3>
          <p className="htmdx-review-card-sub">{assumptionsNote || DEFAULT_NOTE}</p>
          {assumptions.map((assumption) => (
            <div key={assumption.claim} className="htmdx-review-assumption">
              <InlineMarkdown text={assumption.claim} />
              {assumption.points.length > 0 && (
                <ul>
                  {assumption.points.map((point) => (
                    <li key={point}>
                      <InlineMarkdown text={point} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
