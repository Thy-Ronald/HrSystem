import Modal from '../../../components/Modal';
import { ContractFormFields } from './ContractFormFields';

/**
 * Contract modal component for creating/editing contracts
 */
export function ContractModal({ 
  open, 
  editingContractId,
  form,
  updateField,
  errors,
  status,
  saving,
  attendanceBonusAmount,
  perfectAttendanceAmount,
  totalSalary,
  onSubmit,
  onCancel
}) {
  return (
    <Modal 
      open={open} 
      onClose={onCancel} 
      title={editingContractId ? "Edit Contract" : "New Contract"}
    >
      <form className="p-6" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <ContractFormFields
          form={form}
          updateField={updateField}
          errors={errors}
          attendanceBonusAmount={attendanceBonusAmount}
          perfectAttendanceAmount={perfectAttendanceAmount}
          totalSalary={totalSalary}
        />

        <div className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1a73e8] hover:bg-[#1b66c9] text-white px-6 py-2 rounded-full font-medium transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {saving 
                ? (editingContractId ? 'Updating...' : 'Saving...') 
                : (editingContractId ? 'Update Contract' : 'Add Contract')}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-[#dadce0] hover:bg-[#f8f9fa] text-[#5f6368] rounded-full font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          {status.state !== 'idle' && (
            <span className={`text-sm ${status.state === 'error' ? 'text-rose-600' : 'text-[#1a73e8]'}`}>
              {status.message}
            </span>
          )}
        </div>
      </form>
    </Modal>
  );
}
