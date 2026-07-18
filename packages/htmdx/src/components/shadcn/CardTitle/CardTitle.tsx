// Vendored shadcn/ui card title (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('leading-none font-semibold', className)}
      {...props}
    />
  );
}

export { CardTitle };
