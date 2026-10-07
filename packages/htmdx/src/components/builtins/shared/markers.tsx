// Some parts are data, not views: their parent reads their props and children
// and draws them itself. Rendered anywhere else they have nothing to draw, so
// they say where they belong instead of disappearing.
export function partOf(name: string, parent: string) {
  function Part(): never {
    throw new Error(`<${name}> only works inside <${parent}>`);
  }
  Part.displayName = name;
  return Part;
}
