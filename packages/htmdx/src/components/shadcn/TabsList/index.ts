import type { HtmdxComponent } from '../../../component-definition';
import { TabsList as Component } from './TabsList';

export const TabsList = {
  name: 'TabsList',
  purpose: 'Container for the TabsTrigger controls in a Tabs group.',
  example:
    '<Tabs defaultValue="summary">\n  <TabsList>\n    <TabsTrigger value="summary">Summary</TabsTrigger>\n    <TabsTrigger value="details">Details</TabsTrigger>\n  </TabsList>\n  <TabsContent value="summary">Summary panel.</TabsContent>\n  <TabsContent value="details">Details panel.</TabsContent>\n</Tabs>',
  body: 'htmdx',
  Component,
} as const satisfies HtmdxComponent;
