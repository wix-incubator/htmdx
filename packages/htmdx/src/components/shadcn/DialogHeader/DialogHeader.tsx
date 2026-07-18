// Vendored shadcn/ui dialog header (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

export { DialogHeader };
