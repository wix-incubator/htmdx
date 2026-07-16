// Vendored shadcn/ui aspect-ratio (new-york), unmodified apart from the
// individual @radix-ui import and an explicit React import for the
// ComponentProps type.
import * as React from 'react';
import * as AspectRatioPrimitive from '@radix-ui/react-aspect-ratio';

function AspectRatio({ ...props }: React.ComponentProps<typeof AspectRatioPrimitive.Root>) {
  return <AspectRatioPrimitive.Root data-slot="aspect-ratio" {...props} />;
}

export { AspectRatio };
