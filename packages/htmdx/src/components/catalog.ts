import { parseComponentBody } from './body-contracts';
import { intentList } from './intent-list';
import { openQuestions } from './open-questions';
import { signalGrid } from './signal-grid';
import type { HtmdxComponent } from './types';

export const builtInComponents = [
  intentList,
  signalGrid,
  openQuestions,
] as const satisfies readonly HtmdxComponent[];

const names = new Set<string>();
for (const component of builtInComponents) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(component.name)) {
    throw new Error(`invalid built-in component name "${component.name}"`);
  }
  if (!component.purpose.trim() || !component.example.trim()) {
    throw new Error(`built-in component "${component.name}" has incomplete manifest metadata`);
  }

  const normalizedName = component.name.toLowerCase();
  if (names.has(normalizedName)) {
    throw new Error(`duplicate built-in component name "${component.name}"`);
  }
  names.add(normalizedName);
  validateExample(component);
}

function validateExample(component: HtmdxComponent) {
  const match = component.example.match(
    new RegExp(`^<${component.name}>\\r?\\n([\\s\\S]+)\\r?\\n<\\/${component.name}>$`),
  );
  if (!match) {
    throw new Error(
      `invalid example for built-in component "${component.name}": expected one complete <${component.name}> element`,
    );
  }

  const body = match[1];
  switch (component.body) {
    case 'markdown':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
    case 'label-value-list':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
    case 'label-number-list':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
    case 'gfm-table':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
    case 'markdown-list-cards':
      parseComponentBody(component.name, component.body, body, component.validate);
      break;
  }
}
