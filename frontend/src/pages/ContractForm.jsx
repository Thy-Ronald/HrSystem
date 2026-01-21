import { useEffect, useState } from 'react';
import { useContracts } from '../features/contracts/hooks/useContracts';
import { useContractForm } from '../features/contracts/hooks/useContractForm';
import { useContractStatus } from '../features/contracts/hooks/useContractStatus';
import { ContractToolbar } from '../features/contracts/components/ContractToolbar';
import { ContractList } from '../features/contracts/components/ContractList';
import { ContractModal } from '../features/contracts/components/ContractModal';
import { DeleteConfirmDialog } from '../features/contracts/components/DeleteConfirmDialog';

const ITEMS_PER_PAGE = 10;

function ContractForm({ searchQuery = '' }) {
  const [open, setOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, contractId: null, contractName: '' });
  const [currentPage, setCurrentPage] = useState(1);

  const { contracts, loading, error: loadError, refresh, remove } = useContracts();
  const { currentTime } = useContractStatus();
  const {
    form,
    updateField,
    attendanceBonusAmount,
    perfectAttendanceAmount,
    totalSalary,
    errors,
    status,
    saving,
    editingContractId,
    setEditingContractId,
    loadContractForEdit,
    submit,
    reset,
    setErrors,
    setStatus,
  } = useContractForm();

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Listen for modal open event from Layout
  useEffect(() => {
    const handleOpenModal = () => {
      reset();
      setEditingContractId(null);
      setOpen(true);
      setStatus({ state: 'idle', message: '' });
      setErrors({});
    };

    window.addEventListener('openContractModal', handleOpenModal);
    return () => window.removeEventListener('openContractModal', handleOpenModal);
  }, [reset, setEditingContractId, setStatus, setErrors]);

  const handleNewContract = () => {
    reset();
    setEditingContractId(null);
    setOpen(true);
    setStatus({ state: 'idle', message: '' });
    setErrors({});
  };

  const handleEdit = async (contractId) => {
    const loaded = await loadContractForEdit(contractId);
    if (loaded) {
      setOpen(true);
    }
  };

  const handleDelete = (contractId, contractName) => {
    setDeleteConfirm({ open: true, contractId, contractName });
  };

  const handleDeleteConfirm = async () => {
    const { contractId } = deleteConfirm;
    try {
      await remove(contractId);
      
      // Adjust page if current page becomes empty after deletion
      const filteredLength = contracts.length - 1;
      const totalPages = Math.ceil(filteredLength / ITEMS_PER_PAGE);
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      } else if (filteredLength === 0) {
        setCurrentPage(1);
      }
      
      setDeleteConfirm({ open: false, contractId: null, contractName: '' });
      setStatus({ state: 'success', message: 'Contract deleted successfully!' });
      setTimeout(() => setStatus({ state: 'idle', message: '' }), 2000);
    } catch (err) {
      setDeleteConfirm({ open: false, contractId: null, contractName: '' });
      setStatus({ state: 'error', message: 'Unable to delete contract. Please try again.' });
    }
  };

  const handleSubmit = async () => {
    const success = await submit();
    if (success) {
      // Reload contracts list
      await refresh();
      
      // Reset to first page after reload
      setCurrentPage(1);
      
      // Close modal after short delay
      setTimeout(() => {
        setOpen(false);
        setStatus({ state: 'idle', message: '' });
      }, 1500);
    }
  };

  const handleModalClose = () => {
    setOpen(false);
    setEditingContractId(null);
    reset();
    setStatus({ state: 'idle', message: '' });
    setErrors({});
  };

  // Calculate filtered contracts count for toolbar
  const filteredContracts = contracts.filter((contract) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      contract.name?.toLowerCase().includes(query) ||
      contract.position?.toLowerCase().includes(query) ||
      contract.termMonths?.toString().includes(query) ||
      contract.assessmentDate?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col h-full">
      <ContractToolbar
        onNewContract={handleNewContract}
        onRefresh={refresh}
        loading={loading}
        currentPage={currentPage}
        itemsPerPage={ITEMS_PER_PAGE}
        totalItems={filteredContracts.length}
        searchQuery={searchQuery}
      />

      <div className="flex-1 overflow-auto">
        {loading && <div className="p-4 text-center text-[#5f6368]">Loading...</div>}
        {loadError && <div className="p-4 text-center text-rose-600">{loadError}</div>}
        
        {!loading && contracts.length === 0 && !loadError && (
          <div className="p-8 text-center text-[#5f6368]">
            <p className="text-lg">Your contract list is empty</p>
            <p className="text-sm">Click "New Contract" to get started.</p>
          </div>
        )}

        {!loading && contracts.length > 0 && (
          <ContractList
            contracts={contracts}
            searchQuery={searchQuery}
            currentPage={currentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            currentTime={currentTime}
            onPageChange={setCurrentPage}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      <ContractModal
        open={open}
        editingContractId={editingContractId}
        form={form}
        updateField={updateField}
        errors={errors}
        status={status}
        saving={saving}
        attendanceBonusAmount={attendanceBonusAmount}
        perfectAttendanceAmount={perfectAttendanceAmount}
        totalSalary={totalSalary}
        onSubmit={handleSubmit}
        onCancel={handleModalClose}
      />

      <DeleteConfirmDialog
        open={deleteConfirm.open}
        contractName={deleteConfirm.contractName}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, contractId: null, contractName: '' })}
      />
    </div>
  );
}

export default ContractForm;
