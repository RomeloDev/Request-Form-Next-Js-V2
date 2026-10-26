"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

export default function Modal({ open, title, children, onClose, footer, dismissible = true }: { open: boolean; title: string; children: ReactNode; onClose: () => void; footer?: ReactNode; dismissible?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);

  return (
    <dialog ref={ref} onClose={(event) => {
      // Strict Mode can reopen the dialog before a cleanup's queued close event arrives.
      if (!event.currentTarget.open) onClose();
    }} onCancel={(event) => { if (!dismissible) event.preventDefault(); }} aria-labelledby={titleId} className="fixed inset-0 m-auto max-h-[90svh] w-[calc(100%_-_2rem)] max-w-3xl overflow-hidden rounded-2xl border border-line/60 bg-white p-0 text-ink shadow-2xl backdrop:bg-slate-950/50 open:flex open:flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-line/60 bg-slate-50 px-5 py-4 sm:px-7">
        <h2 id={titleId} className="text-xl leading-7 font-semibold">{title}</h2>
        <button type="button" disabled={!dismissible} onClick={() => ref.current?.close()} aria-label="Close dialog" className="grid size-11 shrink-0 place-items-center rounded-lg text-2xl text-muted hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50">×</button>
      </header>
      <div className="min-h-0 overflow-y-auto p-5 sm:p-7">{children}</div>
      <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-line/60 px-5 py-4 sm:px-7">
        {footer ?? <button type="button" disabled={!dismissible} onClick={() => ref.current?.close()} className="min-h-11 rounded-xl border border-line bg-white px-5 py-2.5 text-base font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-50">Close</button>}
      </footer>
    </dialog>
  );
}
