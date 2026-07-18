// Vendored shadcn/ui table caption (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export { TableCaption };
