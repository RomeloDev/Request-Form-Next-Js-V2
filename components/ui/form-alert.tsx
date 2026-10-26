import type { ReactNode, Ref } from "react";

type FormAlertProps = {
  ref?: Ref<HTMLDivElement>;
  message: string;
  children?: ReactNode;
  onDismiss?: () => void;
};

export default function FormAlert({ ref, message, children, onDismiss }: FormAlertProps) {
  return (
    <div ref={ref} role="alert" tabIndex={-1} className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-base leading-7 text-danger focus:outline-2 focus:outline-offset-2 focus:outline-danger">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{message}</p>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss error" className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-lg hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="size-5 stroke-current stroke-2 [stroke-linecap:round]">
              <path d="m5 5 10 10M15 5 5 15" />
            </svg>
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
