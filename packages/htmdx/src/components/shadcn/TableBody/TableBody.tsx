// Vendored shadcn/ui table body (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

export { TableBody };
