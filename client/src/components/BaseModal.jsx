import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export function BaseModal({ children, onClose, labelledBy, panelClassName = "max-w-2xl" }) {
  const panelRef = useRef(null);
  const previousFocus = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    previousFocus.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const panel = panelRef.current;
    panel?.querySelector("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") closeRef.current("escape");
      if (event.key !== "Tab" || !panel) return;
      const items = [...panel.querySelectorAll("button, input, select, textarea, [tabindex]:not([tabindex='-1'])")].filter((item) => !item.disabled);
      if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", keydown); previousFocus.current?.focus?.(); };
  }, []);

  return createPortal(
    <div className="hms-modal-overlay fixed inset-0 z-[9999] grid h-[100dvh] w-screen place-items-center overflow-hidden bg-slate-950/55 p-3 sm:p-6" onMouseDown={(event) => event.target === event.currentTarget && onClose("backdrop")}>
      <section ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={`hms-modal-card flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${panelClassName}`} onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </section>
    </div>, document.body,
  );
}
