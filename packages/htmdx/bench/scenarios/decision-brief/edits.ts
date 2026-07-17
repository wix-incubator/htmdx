import type { EditTask } from '../../edits';

export const title = 'Checkout Migration — Decision Brief';

export const editTasks: EditTask[] = [
  {
    id: 'update-metric',
    description: 'Change the legacy support-ticket volume from 340/month to 290/month',
    htmdx: {
      oldString: '340/month',
      newString: '290/month',
    },
    hand: {
      oldString: '340/month',
      newString: '290/month',
    },
    jsx: {
      oldString: '340/month',
      newString: '290/month',
    },
    md: {
      oldString: '340/month',
      newString: '290/month',
    },
  },
  {
    id: 'add-badge',
    description: 'Add a "source: support dashboard" badge to the Numbers card',
    htmdx: {
      oldString: 'pilot: 0.3% error rate</Badge>',
      newString:
        'pilot: 0.3% error rate</Badge>\n    <Badge variant="outline">source: support dashboard</Badge>',
    },
    hand: {
      oldString: 'pilot: 0.3% error rate</span>',
      newString:
        'pilot: 0.3% error rate</span>\n            <span class="inline-flex items-center rounded-md border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">source: support dashboard</span>',
    },
    jsx: {
      oldString: 'pilot: 0.3% error rate</Badge>',
      newString:
        'pilot: 0.3% error rate</Badge>\n              <Badge variant="outline">source: support dashboard</Badge>',
    },
    md: {
      oldString: '`pilot: 0.3% error rate`',
      newString: '`pilot: 0.3% error rate` · `source: support dashboard`',
    },
  },
  {
    id: 'add-accordion-item',
    description: 'Add a fourth risk item about the refund audit trail',
    htmdx: {
      oldString: '  </AccordionItem>\n</Accordion>',
      newString: `  </AccordionItem>
  <AccordionItem value="audit">
    <AccordionTrigger>Audit trail for migrated refunds</AccordionTrigger>
    <AccordionContent>
      Finance needs a reconciled audit trail for refunds issued during the
      dual-run. Decide this week whether the mapping table doubles as that
      record or a separate export is required.
    </AccordionContent>
  </AccordionItem>
</Accordion>`,
    },
    hand: {
      oldString: '        </details>\n      </section>',
      newString: `        </details>
        <details class="border-b border-slate-200 py-3">
          <summary class="cursor-pointer text-sm font-medium text-slate-900">Audit trail for migrated refunds</summary>
          <p class="pt-2 text-sm">
            Finance needs a reconciled audit trail for refunds issued during the dual-run. Decide this week
            whether the mapping table doubles as that record or a separate export is required.
          </p>
        </details>
      </section>`,
    },
    jsx: {
      oldString: '          </AccordionItem>\n        </Accordion>',
      newString: `          </AccordionItem>
          <AccordionItem value="audit">
            <AccordionTrigger>Audit trail for migrated refunds</AccordionTrigger>
            <AccordionContent>
              Finance needs a reconciled audit trail for refunds issued during the dual-run. Decide
              this week whether the mapping table doubles as that record or a separate export is
              required.
            </AccordionContent>
          </AccordionItem>
        </Accordion>`,
    },
    md: {
      oldString: '## Decision needed',
      newString: `### Audit trail for migrated refunds

Finance needs a reconciled audit trail for refunds issued during the
dual-run. Decide this week whether the mapping table doubles as that
record or a separate export is required.

## Decision needed`,
    },
  },
];
