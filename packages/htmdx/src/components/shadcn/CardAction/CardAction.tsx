// Vendored shadcn/ui card action (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
      {...props}
    />
  );
}

export { CardAction };
