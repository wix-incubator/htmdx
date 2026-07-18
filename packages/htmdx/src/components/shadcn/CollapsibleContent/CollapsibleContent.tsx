// Vendored shadcn/ui collapsible content (new-york), split into its own component file.
import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

function CollapsibleContent(props: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return <CollapsiblePrimitive.Content data-slot="collapsible-content" {...props} />;
}

export { CollapsibleContent };
