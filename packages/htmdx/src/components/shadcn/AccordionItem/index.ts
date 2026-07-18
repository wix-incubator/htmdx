import type { HtmdxComponent } from '../../../component-definition';
import { AccordionItem as Component } from './AccordionItem';

export const AccordionItem = {
  name: 'AccordionItem',
  purpose: 'One named expandable section inside an Accordion.',
  example:
    '<Accordion type="single" collapsible>\n  <AccordionItem value="risks">\n    <AccordionTrigger>Key risks</AccordionTrigger>\n    <AccordionContent>Vendor lock-in.</AccordionContent>\n  </AccordionItem>\n</Accordion>',
  body: 'htmdx',
  props: [
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Unique value that identifies this item within its Accordion.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
