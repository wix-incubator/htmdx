// Vendored shadcn/ui breadcrumb separator (new-york), split into its own component file.
import * as React from 'react';
import { ChevronRight } from 'lucide-react';

import { cn } from '../shared/utils';

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('[&>svg]:size-3.5', className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

export { BreadcrumbSeparator };
