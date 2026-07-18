// Vendored shadcn/ui popover trigger (new-york), split into its own component file.
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

export { PopoverTrigger };
