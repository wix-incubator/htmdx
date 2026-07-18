import type { HtmdxComponent } from '../../../component-definition';
import { TabsTrigger as Component } from './TabsTrigger';

export const TabsTrigger = {
  name: 'TabsTrigger',
  purpose: 'Tab control whose value selects the matching TabsContent.',
  example:
    '<Tabs defaultValue="summary">\n  <TabsList>\n    <TabsTrigger value="summary">Summary</TabsTrigger>\n    <TabsTrigger value="details">Details</TabsTrigger>\n  </TabsList>\n  <TabsContent value="summary">Summary panel.</TabsContent>\n  <TabsContent value="details">Details panel.</TabsContent>\n</Tabs>',
  body: 'htmdx',
  props: [
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Value that links this control to its TabsContent panel.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
