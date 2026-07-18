export function validateCanonicalExamples(components, compile) {
  for (const component of components) {
    if (typeof component.example !== 'string' || !component.example.trim()) {
      throw new Error(`component <${component.name}> requires a canonical example`);
    }

    const result = compile(component.example);
    if (!result.ok) {
      throw new Error(
        `canonical example for <${component.name}> failed to compile: ${result.error}`,
      );
    }

    if (!result.components.includes(component.name)) {
      throw new Error(`canonical example for <${component.name}> does not contain its target`);
    }
  }
}
