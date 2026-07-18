// Vendored shadcn/ui tooltip root (new-york), split into its own component file.
import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

function Tooltip(props: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipPrimitive.Provider delayDuration={0}>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipPrimitive.Provider>
  );
}

export { Tooltip };
