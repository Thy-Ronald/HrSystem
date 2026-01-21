import { createPortal } from 'react-dom';

const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-brand-600">Contract Form</p>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-200"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
