import type { HtmdxComponent } from '../../../component-definition';
import { AccordionTrigger as Component } from './AccordionTrigger';

export const AccordionTrigger = {
  name: 'AccordionTrigger',
  purpose: 'Heading control that opens or closes its AccordionItem.',
  example:
    '<Accordion type="single" collapsible>\n  <AccordionItem value="risks">\n    <AccordionTrigger>Key risks</AccordionTrigger>\n    <AccordionContent>Vendor lock-in.</AccordionContent>\n  </AccordionItem>\n</Accordion>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
