import {
  cloneElement,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

// The creator-kit layout lets a component that is a whole review, not a
// section of a document, drive two parts of the page chrome: it can put its
// own navigation in the layout's left rail, and it can shrink the hero once
// the reader is past the opening view. Both are opt-in; a page without such a
// component renders exactly like the default layout.
export type PageChrome = {
  /** The rail element to portal navigation into, once it has mounted. */
  navSlot: HTMLElement | null;
  setCompactHero: (compact: boolean) => void;
};

export const PageChromeContext = createContext<PageChrome | null>(null);
const NavSlotSetter = createContext<(node: HTMLElement | null) => void>(() => {});
const CompactHero = createContext(false);

export function PageChromeProvider({ children }: { children?: ReactNode }) {
  const [navSlot, setNavSlot] = useState<HTMLElement | null>(null);
  const [compact, setCompactHero] = useState(false);
  const chrome = useMemo(() => ({ navSlot, setCompactHero }), [navSlot]);
  return (
    <PageChromeContext.Provider value={chrome}>
      <NavSlotSetter.Provider value={setNavSlot}>
        <CompactHero.Provider value={compact}>{children}</CompactHero.Provider>
      </NavSlotSetter.Provider>
    </PageChromeContext.Provider>
  );
}

export function PageNavSlot() {
  const setNavSlot = useContext(NavSlotSetter);
  return <div className="htmdx-toc-slot" ref={setNavSlot} />;
}

export function PageHero({ children }: { children: ReactElement }) {
  const compact = useContext(CompactHero);
  const hero = children as ReactElement<{ className?: string }>;
  return compact
    ? cloneElement(hero, { className: `${hero.props.className} htmdx-hero--compact` })
    : hero;
}
