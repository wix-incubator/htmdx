import type { HtmdxComponent } from '../../../component-definition';
import { Tabs as Component } from './Tabs';

export const Tabs = {
  name: 'Tabs',
  purpose: 'Tab group that shows the TabsContent matching the selected TabsTrigger.',
  example:
    '<Tabs defaultValue="summary">\n  <TabsList>\n    <TabsTrigger value="summary">Summary</TabsTrigger>\n    <TabsTrigger value="details">Details</TabsTrigger>\n  </TabsList>\n  <TabsContent value="summary">Summary panel.</TabsContent>\n  <TabsContent value="details">Details panel.</TabsContent>\n</Tabs>',
  body: 'htmdx',
  props: [
    {
      name: 'defaultValue',
      type: 'string',
      required: true,
      description: 'Value of the tab selected when the group first renders.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
