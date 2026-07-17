import type { EditTask } from '../../edits';

export const title = 'Executive Decision Report: Support Platform Consolidation';

export const editTasks: EditTask[] = [
  {
    id: 'update-savings',
    description: 'Change the annual-savings metric from $1.2M to $1.4M',
    htmdx: {
      oldString: '**$1.2M**',
      newString: '**$1.4M**',
    },
    hand: {
      oldString: '>$1.2M</dd>',
      newString: '>$1.4M</dd>',
    },
    jsx: {
      oldString: 'value: "$1.2M"',
      newString: 'value: "$1.4M"',
    },
    md: {
      oldString: '| $1.2M',
      newString: '| $1.4M',
    },
  },
  {
    id: 'add-callout',
    description: 'Add a data-freshness callout right after the executive summary',
    htmdx: {
      oldString: '</ExecutiveSummary>',
      newString: `</ExecutiveSummary>

<Callout>
Pilot metrics are current as of **1 September 2026**; Finance refreshes them weekly until the decision date.
</Callout>`,
    },
    hand: {
      oldString: `gates.
        </p>
      </section>`,
      newString: `gates.
        </p>
      </section>

      <aside class="rounded-lg border border-slate-200 border-l-4 border-l-slate-400 bg-slate-50 px-5 py-4">
        <p>
          Pilot metrics are current as of <strong class="text-slate-900">1 September 2026</strong>;
          Finance refreshes them weekly until the decision date.
        </p>
      </aside>`,
    },
    jsx: {
      oldString: `        </CardContent>
      </Card>`,
      newString: `        </CardContent>
      </Card>

      <Alert>
        <AlertDescription>
          Pilot metrics are current as of <strong>1 September 2026</strong>; Finance refreshes them
          weekly until the decision date.
        </AlertDescription>
      </Alert>`,
    },
    md: {
      oldString: '> cohort meets the agreed service and reliability gates.',
      newString: `> cohort meets the agreed service and reliability gates.

> Pilot metrics are current as of **1 September 2026**; Finance refreshes
> them weekly until the decision date.`,
    },
  },
  {
    id: 'change-date',
    description: 'Move the decision date from 15 to 22 September 2026',
    htmdx: {
      oldString: '15 September 2026',
      newString: '22 September 2026',
    },
    hand: {
      oldString: '15 September 2026',
      newString: '22 September 2026',
    },
    jsx: {
      oldString: '15 September 2026',
      newString: '22 September 2026',
    },
    md: {
      oldString: '15 September 2026',
      newString: '22 September 2026',
    },
  },
];
