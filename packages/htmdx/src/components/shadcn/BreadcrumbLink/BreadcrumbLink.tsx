// Vendored shadcn/ui breadcrumb link (new-york), split into its own component file.
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

import { cn } from '../shared/utils';

function BreadcrumbLink({
  asChild,
  className,
  ...props
}: React.ComponentProps<'a'> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot : 'a';

  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn('transition-colors hover:text-foreground', className)}
      {...props}
    />
  );
}

export { BreadcrumbLink };
