import { createPortal } from 'react-dom';

const Modal = ({ open, onClose, title, subtitle, children, size = 'medium' }) => {
  if (!open) return null;

  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-5xl',
    xl: 'max-w-7xl',
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`relative w-full ${sizeClasses[size] || sizeClasses.medium} bg-white shadow-2xl rounded-lg overflow-hidden flex flex-col mx-4`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#f2f6fc] px-4 py-3">
          <div className="flex flex-col">
            <h2 className="text-sm font-medium text-[#202124]">{title}</h2>
            {subtitle && (
              <p className="text-xs text-[#70757a] mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-[#5f6368] hover:bg-black/5 rounded transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="max-h-[85vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
