// Vendored shadcn/ui breadcrumb link (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function BreadcrumbLink({ className, ...props }: React.ComponentProps<'a'>) {
  return (
    <a
      data-slot="breadcrumb-link"
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  );
}

export { BreadcrumbLink };
