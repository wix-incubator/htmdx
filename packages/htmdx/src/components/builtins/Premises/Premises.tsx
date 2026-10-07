import { domAttributes } from '../shared/attributes';
import { InlineMarkdown } from '../shared/structured';

type PremisesProps = {
  title?: string;
  assumptionsTitle?: string;
  note?: string;
  body?: string;
  className?: string;
} & Record<string, unknown>;

type Fact = { label: string; value: string };
type Assumption = { claim: string; points: string[] };

const DEFAULT_NOTE =
  'If any of these is wrong, say so before reading on: everything below was written on top of them.';

// `- **Label:** value` rows are facts; any other `- row` is an assumption,
// with indented `- point` rows under a claim that contains a list.
function parsePremises(body: string) {
  const facts: Fact[] = [];
  const assumptions: Assumption[] = [];
  for (const line of body.split('\n')) {
    const row = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (!row) {
      continue;
    }
    const text = row[2].trim();
    const fact = !row[1] && text.match(/^\*\*([^*]+?):?\*\*:?\s*(.+)$/);
    if (fact) {
      facts.push({ label: fact[1].trim(), value: fact[2].trim() });
    } else if (row[1] && assumptions.length > 0) {
      assumptions[assumptions.length - 1].points.push(text);
    } else {
      assumptions.push({ claim: text, points: [] });
    }
  }
  return { facts, assumptions };
}

// What a piece of work understood its subject to be, and what it took as
// true. Two cards, because they answer different questions: a reader who
// agrees with the first still has to check the second.
export function Premises({
  title = 'About this feature',
  assumptionsTitle = 'Assumptions',
  note = DEFAULT_NOTE,
  body = '',
  className,
  ...props
}: PremisesProps) {
  const { facts, assumptions } = parsePremises(body);
  return (
    <section
      {...domAttributes(props)}
      data-htmdx-component="Premises"
      className={['htmdx-component htmdx-premises', className].filter(Boolean).join(' ')}
    >
      {facts.length > 0 && (
        <div className="htmdx-premises-card">
          <h3>{title}</h3>
          {facts.map((fact) => (
            <div key={fact.label} className="htmdx-premises-fact">
              <div className="htmdx-premises-label">{fact.label}</div>
              <div className="htmdx-premises-value">
                <InlineMarkdown text={fact.value} />
              </div>
            </div>
          ))}
        </div>
      )}
      {assumptions.length > 0 && (
        <div className="htmdx-premises-card">
          <h3>{assumptionsTitle}</h3>
          <p className="htmdx-premises-note">{note}</p>
          {/* Bullets, not ruled rows: a short list of separate claims scans
              faster as a list than as a stack of divided lines. */}
          <ul className="htmdx-premises-list">
            {assumptions.map((assumption) => (
              <li key={assumption.claim}>
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export const premisesStyles = `
  .htmdx-premises { display: flex; flex-direction: column; gap: 20px; color: var(--md-sys-color-on-surface); }
  .htmdx-premises-card { padding: 24px 28px; border: 1px solid var(--md-sys-color-outline-variant); border-left: 4px solid var(--md-sys-color-primary); border-radius: 14px; background: var(--md-sys-color-surface-container-lowest, #fff); }
  .htmdx-premises-card.htmdx-premises-card.htmdx-premises-card > h3 { margin: 0 0 10px; font-size: 18px; font-weight: 500; }
  .htmdx-premises-fact { display: flex; gap: 16px; padding: 9px 0; border-top: 1px solid var(--md-sys-color-surface-container-low); }
  .htmdx-premises-fact:first-of-type { border-top: 0; padding-top: 2px; }
  .htmdx-premises-label { flex: 0 0 104px; padding-top: 4px; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #a1a1aa; }
  .htmdx-premises-value { flex: 1; min-width: 0; font-size: 15px; line-height: 1.6; color: var(--md-sys-color-on-surface-variant); }
  .htmdx-premises-note.htmdx-premises-note.htmdx-premises-note { margin: 0 0 6px; font-size: 13.5px; line-height: 1.55; color: var(--md-sys-color-on-surface-variant); }
  .htmdx-premises-list.htmdx-premises-list.htmdx-premises-list { margin: 8px 0 0; padding-left: 20px; list-style: disc; }
  .htmdx-premises-list.htmdx-premises-list.htmdx-premises-list > li { margin-bottom: 6px; font-size: 14.5px; line-height: 1.55; }
  .htmdx-premises-list.htmdx-premises-list.htmdx-premises-list ul { margin: 6px 0 0; padding-left: 18px; list-style: circle; font-size: 13.5px; }
  @media (max-width: 960px) {
    .htmdx-premises-card { padding: 18px; }
    .htmdx-premises-fact { flex-direction: column; gap: 4px; }
    .htmdx-premises-label { flex-basis: auto; padding-top: 0; }
  }
`;
