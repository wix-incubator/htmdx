// Vendored shadcn/ui breadcrumb page (new-york), split into its own component file.
import * as React from 'react';

import { cn } from '../shared/utils';

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('font-normal text-foreground', className)}
      {...props}
    />
  );
}

export { BreadcrumbPage };
