import { useCallback, useLayoutEffect, useRef, useState } from "react";

const OVERSCAN = 12;

/** The range of fixed-height lines to draw for a scrolling list. */
export const useVirtualList = (count: number, lineHeight: number) => {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(600);

  useLayoutEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const observer = new ResizeObserver(() => setHeight(element.clientHeight));
    observer.observe(element);
    setHeight(element.clientHeight);
    return () => observer.disconnect();
  }, []);

  const onScroll = useCallback(
    () => setScrollTop(ref.current?.scrollTop ?? 0),
    [],
  );
  const first = Math.max(0, Math.floor(scrollTop / lineHeight) - OVERSCAN);
  const last = Math.min(
    count,
    Math.ceil((scrollTop + height) / lineHeight) + OVERSCAN,
  );
  return {
    ref,
    onScroll,
    first,
    last,
    totalHeight: count * lineHeight,
    offset: first * lineHeight,
  };
};
