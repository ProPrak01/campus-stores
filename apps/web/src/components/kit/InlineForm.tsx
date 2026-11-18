import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wrapper for the small forms that open under a kit line.
 * Focuses the first field on open, closes on Escape, and gives focus back to the button that opened it.
 */
export function InlineForm({
  children,
  onClose,
}: {
  children: (close: () => void) => ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Captured during the first render, before the first field takes focus.
  const opener = useRef<HTMLElement | null>(document.activeElement as HTMLElement | null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, []);

  const close = () => {
    onClose();
    requestAnimationFrame(() => opener.current?.focus());
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return <div ref={ref}>{children(close)}</div>;
}
