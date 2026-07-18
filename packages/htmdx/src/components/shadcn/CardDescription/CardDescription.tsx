// Vendored shadcn/ui card description (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export { CardDescription };
