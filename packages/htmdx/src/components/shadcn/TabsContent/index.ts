import type { HtmdxComponent } from '../../../component-definition';
import { TabsContent as Component } from './TabsContent';

export const TabsContent = {
  name: 'TabsContent',
  purpose: 'Panel shown when its value matches the selected TabsTrigger.',
  example:
    '<Tabs defaultValue="summary">\n  <TabsList>\n    <TabsTrigger value="summary">Summary</TabsTrigger>\n    <TabsTrigger value="details">Details</TabsTrigger>\n  </TabsList>\n  <TabsContent value="summary">Summary with **key metrics**.</TabsContent>\n  <TabsContent value="details">Details panel.</TabsContent>\n</Tabs>',
  body: 'htmdx',
  props: [
    {
      name: 'value',
      type: 'string',
      required: true,
      description: 'Value that links this panel to its TabsTrigger control.',
    },
  ],
  Component,
} as const satisfies HtmdxComponent;
