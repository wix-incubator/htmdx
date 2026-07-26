// compile() takes its snapshot through the client renderer, so a component has
// no other way to tell a static snapshot from a live document. Anything that
// only works with React attached checks this before rendering itself.
let staticRender = false;

export function isStaticRender() {
  return staticRender;
}

export function withStaticRender<T>(render: () => T): T {
  staticRender = true;
  try {
    return render();
  } finally {
    staticRender = false;
  }
}
