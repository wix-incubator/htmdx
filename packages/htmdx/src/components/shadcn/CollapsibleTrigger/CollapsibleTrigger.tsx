// Vendored shadcn/ui collapsible trigger (new-york), split into its own component file.
import * as React from 'react';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

function CollapsibleTrigger(props: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />;
}

export { CollapsibleTrigger };
