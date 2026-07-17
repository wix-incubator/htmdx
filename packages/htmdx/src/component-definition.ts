import type { ComponentType, ExoticComponent } from 'react';

export type HtmdxPropType = 'string' | 'number' | 'boolean' | 'json';

export type HtmdxJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly HtmdxJsonValue[]
  | { readonly [key: string]: HtmdxJsonValue };

type HtmdxPropBase<T extends HtmdxPropType, V> = {
  name: string;
  type: T;
  required?: boolean;
  values?: readonly V[];
  default?: V;
  description?: string;
};

export type HtmdxStringProp = HtmdxPropBase<'string', string> & {
  pattern?: string;
};

export type HtmdxNumberProp = HtmdxPropBase<'number', number> & {
  min?: number;
  max?: number;
};

export type HtmdxBooleanProp = HtmdxPropBase<'boolean', boolean>;
export type HtmdxJsonProp = HtmdxPropBase<'json', HtmdxJsonValue>;

export type HtmdxProp = HtmdxStringProp | HtmdxNumberProp | HtmdxBooleanProp | HtmdxJsonProp;

export type HtmdxComponent = {
  name: string;
  purpose: string;
  example: string;
  body: 'markdown' | 'htmdx' | 'none';
  props?: readonly HtmdxProp[];
  // Component prop shapes are definition-owned and checked when authored.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any> | ExoticComponent<any>;
};

export type HtmdxComponentDefinitions = readonly HtmdxComponent[];

export function createDefinitionRegistry(
  definitions: HtmdxComponentDefinitions = [],
  reservedNames: Iterable<string> = [],
): Map<string, HtmdxComponent> {
  const names = new Map<string, string>();
  for (const name of reservedNames) {
    names.set(name.toLowerCase(), name);
  }

  const registry = new Map<string, HtmdxComponent>();
  for (const definition of definitions) {
    validateDefinition(definition);
    const lower = definition.name.toLowerCase();
    const existing = names.get(lower);
    if (existing) {
      throw new Error(`component <${definition.name}> collides with <${existing}>`);
    }
    names.set(lower, definition.name);
    registry.set(lower, definition);
  }
  return registry;
}

export function validateDefinition(definition: HtmdxComponent): void {
  if (!definition || typeof definition !== 'object') {
    throw new Error('component definition must be an object');
  }
  if (!isComponentName(definition.name)) {
    throw new Error(`invalid component name "${String(definition.name)}"`);
  }
  if (typeof definition.purpose !== 'string' || !definition.purpose.trim()) {
    throw new Error(`component <${definition.name}> requires a purpose`);
  }
  if (typeof definition.example !== 'string' || !definition.example.trim()) {
    throw new Error(`component <${definition.name}> requires an example`);
  }
  if (!['markdown', 'htmdx', 'none'].includes(definition.body)) {
    throw new Error(`component <${definition.name}> has invalid body mode "${definition.body}"`);
  }
  if (!isExecutableReactComponent(definition.Component)) {
    throw new Error(`component <${definition.name}> requires a React Component`);
  }

  const propNames = new Set<string>();
  for (const prop of definition.props || []) {
    validatePropDefinition(definition.name, prop);
    if (propNames.has(prop.name)) {
      throw new Error(`component <${definition.name}> declares prop "${prop.name}" more than once`);
    }
    propNames.add(prop.name);
  }
}

function validatePropDefinition(componentName: string, prop: HtmdxProp): void {
  if (!prop || typeof prop !== 'object' || !/^[A-Za-z][A-Za-z0-9]*$/.test(prop.name)) {
    throw new Error(`component <${componentName}> has invalid prop name "${String(prop?.name)}"`);
  }
  if (prop.name === 'class' || prop.name === 'id' || /^(aria|data)-/i.test(prop.name)) {
    throw new Error(`component <${componentName}> cannot redeclare universal prop "${prop.name}"`);
  }
  if (/^on/i.test(prop.name)) {
    throw new Error(
      `component <${componentName}> cannot declare event handler prop "${prop.name}"`,
    );
  }
  if (!['string', 'number', 'boolean', 'json'].includes(prop.type)) {
    throw new Error(
      `component <${componentName}> prop "${prop.name}" has invalid type "${prop.type}"`,
    );
  }
  if (prop.description !== undefined && typeof prop.description !== 'string') {
    throw new Error(`component <${componentName}> prop "${prop.name}" has invalid description`);
  }
  if (prop.values !== undefined) {
    if (!Array.isArray(prop.values) || prop.values.length === 0) {
      throw new Error(`component <${componentName}> prop "${prop.name}" requires allowed values`);
    }
    for (const value of prop.values) {
      assertTypedMetadataValue(componentName, prop, value, 'allowed value');
    }
  }
  if (prop.default !== undefined) {
    assertTypedMetadataValue(componentName, prop, prop.default, 'default');
    validateConstraints(componentName, prop, prop.default);
  }

  if (prop.type === 'string' && prop.pattern !== undefined) {
    try {
      RegExp(prop.pattern);
    } catch {
      throw new Error(`component <${componentName}> prop "${prop.name}" has invalid pattern`);
    }
  }
  if (prop.type === 'number') {
    if (prop.min !== undefined && !Number.isFinite(prop.min)) {
      throw new Error(`component <${componentName}> prop "${prop.name}" has invalid minimum`);
    }
    if (prop.max !== undefined && !Number.isFinite(prop.max)) {
      throw new Error(`component <${componentName}> prop "${prop.name}" has invalid maximum`);
    }
    if (prop.min !== undefined && prop.max !== undefined && prop.min > prop.max) {
      throw new Error(`component <${componentName}> prop "${prop.name}" has minimum above maximum`);
    }
  }
}

function assertTypedMetadataValue(
  componentName: string,
  prop: HtmdxProp,
  value: unknown,
  field: string,
): void {
  const valid =
    prop.type === 'json'
      ? isJsonValue(value)
      : prop.type === 'number'
        ? typeof value === 'number' && Number.isFinite(value)
        : typeof value === prop.type;
  if (!valid) {
    throw new Error(
      `component <${componentName}> prop "${prop.name}" has invalid ${field} for ${prop.type}`,
    );
  }
}

function isJsonValue(value: unknown): value is HtmdxJsonValue {
  if (value === null || ['string', 'boolean'].includes(typeof value)) {
    return true;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  return typeof value === 'object' && value !== null && Object.values(value).every(isJsonValue);
}

export function validateConstraints(componentName: string, prop: HtmdxProp, value: unknown): void {
  if (prop.values && !prop.values.some((allowed) => valuesEqual(allowed, value))) {
    throw new Error(
      `invalid prop "${prop.name}" for <${componentName}>: must be one of ${prop.values
        .map((allowed) => JSON.stringify(allowed))
        .join(', ')}`,
    );
  }
  if (prop.type === 'string' && prop.pattern && !new RegExp(prop.pattern).test(value as string)) {
    throw new Error(
      `invalid prop "${prop.name}" for <${componentName}>: value does not match pattern ${prop.pattern}`,
    );
  }
  if (prop.type === 'number' && prop.min !== undefined && (value as number) < prop.min) {
    throw new Error(
      `invalid prop "${prop.name}" for <${componentName}>: value must be at least ${prop.min}`,
    );
  }
  if (prop.type === 'number' && prop.max !== undefined && (value as number) > prop.max) {
    throw new Error(
      `invalid prop "${prop.name}" for <${componentName}>: value must be at most ${prop.max}`,
    );
  }
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

function isExecutableReactComponent(value: unknown): boolean {
  if (typeof value === 'function') {
    return true;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const reactType = (value as { $$typeof?: unknown }).$$typeof;
  return [
    Symbol.for('react.forward_ref'),
    Symbol.for('react.lazy'),
    Symbol.for('react.memo'),
  ].includes(reactType as symbol);
}

function isComponentName(name: unknown): name is string {
  return typeof name === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(name);
}
