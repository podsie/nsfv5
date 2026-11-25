import { useEffect, useRef, type ReactNode } from "react";

export const Modal = ({
  title,
  closeLabel,
  open,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="modal"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="modal-body">
        <header className="modal-head">
          <h2>{title}</h2>
          <button className="link" onClick={onClose}>
            {closeLabel}
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
};
