import type { HtmdxComponent } from '../../../component-definition';
import { Accordion as Component } from './Accordion';

export const Accordion = {
  name: 'Accordion',
  purpose: 'Group of expandable AccordionItem sections; choose single or multiple open items.',
  example:
    '<Accordion type="single" collapsible defaultValue=\'"risks"\'>\n  <AccordionItem value="risks">\n    <AccordionTrigger>Key risks</AccordionTrigger>\n    <AccordionContent>Vendor lock-in.</AccordionContent>\n  </AccordionItem>\n</Accordion>',
  body: 'htmdx',
  props: [
    {
      name: 'type',
      type: 'string',
      required: true,
      values: ['single', 'multiple'],
      description: 'Whether one or many items can be open at once.',
    },
    {
      name: 'collapsible',
      type: 'boolean',
      default: false,
      description: 'For type single, lets the open item close when selected again.',
    },
    {
      name: 'defaultValue',
      type: 'json',
      description:
        'Initially open item value: a JSON string for type single or a JSON string array for type multiple.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
