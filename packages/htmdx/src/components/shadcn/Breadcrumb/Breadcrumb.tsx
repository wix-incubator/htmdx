// Vendored shadcn/ui breadcrumb root (new-york), split into its own component file.
import * as React from 'react';

function Breadcrumb(props: React.ComponentProps<'nav'>) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

export { Breadcrumb };
