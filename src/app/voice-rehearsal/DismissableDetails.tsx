'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export default function DismissableDetails({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const details = detailsRef.current;
    if (!details) return;

    function dismissOutside(event: PointerEvent) {
      if (!details?.contains(event.target as Node)) setOpen(false);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      details?.querySelector('summary')?.focus();
    }

    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [open]);

  return (
    <details
      ref={detailsRef}
      className={className}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest('button, a') && !target.closest('summary')) setOpen(false);
      }}
    >
      {children}
    </details>
  );
}
