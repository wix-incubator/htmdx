import type { ComponentType, ReactNode } from 'react';

export type HtmdxLayoutProps = {
  children: ReactNode;
  slots: Readonly<Record<string, string | undefined>>;
};

export type HtmdxLayoutSlot = {
  from: string;
};

export type HtmdxLayoutDefinition = {
  name: string;
  slots?: Readonly<Record<string, HtmdxLayoutSlot>>;
  Component: ComponentType<HtmdxLayoutProps>;
};

const BUILT_IN_LAYOUTS = new Set(['default', 'blank']);
const registeredLayouts = new Map<string, HtmdxLayoutDefinition>();

export function addLayout(definition: HtmdxLayoutDefinition) {
  const name = definition.name.trim();
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(name)) {
    throw new Error(`invalid layout name "${definition.name}"`);
  }

  const key = name.toLowerCase();
  if (BUILT_IN_LAYOUTS.has(key)) {
    throw new Error(`layout name "${definition.name}" collides with built-in layout "${key}"`);
  }
  if (registeredLayouts.has(key)) {
    throw new Error(`layout name "${definition.name}" is already registered`);
  }

  const slots = Object.fromEntries(
    Object.entries(definition.slots || {}).map(([slot, mapping]) => {
      const from = mapping.from.trim().toLowerCase();
      if (!slot.trim() || !from) {
        throw new Error(`layout "${definition.name}" has an invalid slot mapping for "${slot}"`);
      }
      return [slot, { from }];
    }),
  );

  registeredLayouts.set(key, { ...definition, name, slots });
}

export function getLayout(name: string) {
  return registeredLayouts.get(name.toLowerCase());
}

export function resolveLayoutSlots(
  definition: HtmdxLayoutDefinition,
  meta: Readonly<Record<string, string>>,
) {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(definition.slots || {}).map(([slot, mapping]) => [slot, meta[mapping.from]]),
    ),
  );
}
