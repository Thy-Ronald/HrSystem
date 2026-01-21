import Modal from '../../../components/Modal';

/**
 * Delete confirmation dialog component
 */
export function DeleteConfirmDialog({ open, contractName, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title="Delete Contract">
      <div className="p-6">
        <p className="text-[#202124] mb-6">
          Are you sure you want to delete the contract for <strong>{contractName}</strong>? 
          This action cannot be undone.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[#dadce0] hover:bg-[#f8f9fa] text-[#5f6368] rounded-full font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#ea4335] hover:bg-[#d33b2c] text-white rounded-full font-medium transition-colors shadow-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </Modal>
  );
}
