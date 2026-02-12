import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useContracts } from '../features/contracts/hooks/useContracts';
import { useContractForm } from '../features/contracts/hooks/useContractForm';
import { useContractStatus } from '../features/contracts/hooks/useContractStatus';
import { ContractToolbar } from '../features/contracts/components/ContractToolbar';
import { ContractList } from '../features/contracts/components/ContractList';
import { ContractModal } from '../features/contracts/components/ContractModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

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

    const handleOpenEditModal = async (event) => {
      const { contractId } = event.detail;
      if (contractId) {
        const loaded = await loadContractForEdit(contractId);
        if (loaded) {
          setOpen(true);
        }
      }
    };

    window.addEventListener('openContractModal', handleOpenModal);
    window.addEventListener('openContractEditModal', handleOpenEditModal);
    return () => {
      window.removeEventListener('openContractModal', handleOpenModal);
      window.removeEventListener('openContractEditModal', handleOpenEditModal);
    };
  }, [reset, setEditingContractId, setStatus, setErrors, loadContractForEdit]);

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

  return (
    <Box sx={{ width: '100%', minHeight: '100%', bgcolor: 'background.paper' }}>
      {/* Page Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-normal text-[#202124] dark:text-slate-100 tracking-tight">
            Contracts
          </h1>
        </div>

        <ContractToolbar
          onNewContract={handleNewContract}
          onRefresh={refresh}
          loading={loading}
          contracts={contracts}
          currentTime={currentTime}
        />
      </div>

      {/* Page Content */}
      <Box sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading && <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>Loading...</Box>}
        {loadError && <Box sx={{ p: 4, textAlign: 'center', color: 'error.main' }}>{loadError}</Box>}

        {!loading && contracts.length === 0 && !loadError && (
          <Box sx={{ p: 8, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="h6">Your contract list is empty</Typography>
            <Typography variant="body2">Click "New" to get started.</Typography>
          </Box>
        )}

        {!loading && contracts.length > 0 && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
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
          </Box>
        )}
      </Box>

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
      <ConfirmDialog
        open={deleteConfirm.open}
        title="DELETE CONTRACT"
        description={<>Are you sure you want to delete the contract for <strong className="text-slate-900">{deleteConfirm.contractName}</strong>?<br />This action cannot be undone.</>}
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, contractId: null, contractName: '' })}
      />
    </Box>
  );
}

export default ContractForm;

