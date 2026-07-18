import type { HtmdxComponent } from '../../../component-definition';
import { AccordionContent as Component } from './AccordionContent';

export const AccordionContent = {
  name: 'AccordionContent',
  purpose: 'Content revealed when its AccordionItem is open.',
  example:
    '<Accordion type="single" collapsible defaultValue=\'"risks"\'>\n  <AccordionItem value="risks">\n    <AccordionTrigger>Key risks</AccordionTrigger>\n    <AccordionContent>Vendor **lock-in**.</AccordionContent>\n  </AccordionItem>\n</Accordion>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
