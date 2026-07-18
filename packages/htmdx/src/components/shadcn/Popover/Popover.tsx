// Vendored shadcn/ui popover root (new-york), split into its own component file.
import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

export { Popover };
