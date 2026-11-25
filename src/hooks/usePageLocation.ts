import { useCallback, useSyncExternalStore } from "react";

export const TABS = ["summary", "rules", "students"] as const;
export type Tab = (typeof TABS)[number];

/** The place in the explorer that the address names, after the `#`. */
export interface PageLocation {
  tab: Tab;
  /** The enrollment id of the open student, or of the open session's student. */
  enrollmentId: string | null;
  /** The id of the open session. Null when a student is open. */
  sessionId: string | null;
}

export const locationOf = (hash: string): PageLocation => {
  const [tab, enrollmentId, sessionId] = hash
    .replace(/^#\/?/, "")
    .split("/")
    .map(decodeURIComponent);
  return {
    tab: TABS.find((known) => known === tab) ?? "summary",
    enrollmentId: enrollmentId || null,
    sessionId: sessionId || null,
  };
};

export const hashOf = ({ tab, enrollmentId, sessionId }: PageLocation) =>
  `#/${[tab, enrollmentId, sessionId]
    .filter((part): part is string => part !== null)
    .map(encodeURIComponent)
    .join("/")}`;

const subscribe = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

/** Reads the place from the address and writes it there, so a reload and the back button keep it. */
export const usePageLocation = () => {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const go = useCallback((next: PageLocation) => {
    window.location.hash = hashOf(next);
  }, []);
  return { location: locationOf(hash), go };
};
