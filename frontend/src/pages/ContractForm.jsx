import { useEffect, useState } from 'react';
import SectionCard from '../components/SectionCard';
import { submitContract, fetchContracts, deleteContract, updateContract, fetchContractById } from '../services/api';
import { useContractCalculator } from '../hooks/useContractCalculator';
import { formatDate } from '../utils/format';
import Modal from '../components/Modal';

function Field({ label, children, required, error }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {error && <span className="text-xs text-rose-600 mt-1">{error}</span>}
    </label>
  );
}

function ContractForm({ searchQuery = '' }) {
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [contracts, setContracts] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingContractId, setEditingContractId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, contractId: null, contractName: '' });
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    form,
    updateField,
    attendanceBonusAmount,
    perfectAttendanceAmount,
    totalSalary,
    reset,
  } = useContractCalculator();

  // Fetch contracts on mount
  useEffect(() => {
    loadContracts();
  }, []);

  // Update current time every minute to trigger status recalculation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

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
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchContracts();
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading contracts:', err);
      setContracts([]);
      setLoadError(err.message || 'Unable to load contracts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const next = {};

    // Required fields matching MySQL schema
    if (!String(form.employeeName ?? '').trim()) {
      next.employeeName = 'Employee Name is required';
    }
    if (!String(form.position ?? '').trim()) {
      next.position = 'Position is required';
    }
    if (!form.assessmentDate) {
      next.assessmentDate = 'Assessment Date is required';
    }
    if (!form.basicSalary || form.basicSalary === '') {
      next.basicSalary = 'Basic Salary is required';
    }
    if (!form.term || form.term === '') {
      next.term = 'Term (months) is required';
    }

    // Numeric validation
    const nonNegativeNumber = (key, label) => {
      if (form[key] === '' || form[key] === null || form[key] === undefined) return;
      const value = Number(form[key]);
      if (!Number.isFinite(value)) next[key] = `${label} must be a number`;
      else if (value < 0) next[key] = `${label} must be 0 or greater`;
    };

    nonNegativeNumber('basicSalary', 'Basic Salary');
    nonNegativeNumber('allowance', 'Allowance');
    nonNegativeNumber('signingBonus', 'Signing Bonus');
    nonNegativeNumber('attendanceBonusPercent', 'Attendance Bonus (%)');
    nonNegativeNumber('perfectAttendancePercent', 'Perfect Attendance (%)');

    const percent = (key, label) => {
      if (form[key] === '' || form[key] === null || form[key] === undefined) return;
      const value = Number(form[key]);
      if (Number.isFinite(value) && (value < 0 || value > 100)) {
        next[key] = `${label} must be between 0 and 100`;
      }
    };

    percent('attendanceBonusPercent', 'Attendance Bonus (%)');
    percent('perfectAttendancePercent', 'Perfect Attendance (%)');

    // Validate term is a positive integer
    if (form.term && form.term !== '') {
      const termValue = Number(form.term);
      if (!Number.isInteger(termValue) || termValue < 1) {
        next.term = 'Term must be a positive integer (months)';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const loadContractForEdit = async (contractId) => {
    try {
      const contract = await fetchContractById(contractId);
      
      // Map contract data to form format
      updateField('employeeName', contract.name || '');
      updateField('position', contract.position || '');
      updateField('assessmentDate', contract.assessmentDate ? contract.assessmentDate.split('T')[0] : '');
      updateField('term', contract.termMonths?.toString() || '');
      updateField('basicSalary', contract.basicSalary?.toString() || '');
      updateField('allowance', contract.allowance?.toString() || '');
      updateField('signingBonus', contract.signingBonus?.toString() || '');
      
      // Calculate percentages from bonus amounts if needed
      if (contract.attendanceBonus && contract.basicSalary) {
        const percent = ((contract.attendanceBonus / contract.basicSalary) * 100).toFixed(2);
        updateField('attendanceBonusPercent', percent);
      }
      
      if (contract.fullAttendanceBonus && contract.basicSalary) {
        const percent = ((contract.fullAttendanceBonus / contract.basicSalary) * 100).toFixed(2);
        updateField('perfectAttendancePercent', percent);
      }
      
      setEditingContractId(contractId);
      setOpen(true);
      setStatus({ state: 'idle', message: '' });
      setErrors({});
    } catch (err) {
      console.error('Error loading contract:', err);
      setStatus({ state: 'error', message: 'Unable to load contract for editing.' });
    }
  };

  const handleDeleteClick = (contractId, contractName) => {
    setDeleteConfirm({ open: true, contractId, contractName });
  };

  const handleDeleteConfirm = async () => {
    const { contractId } = deleteConfirm;
    try {
      await deleteContract(contractId);
      const data = await fetchContracts();
      const updatedContractsList = Array.isArray(data) ? data : [];
      setContracts(updatedContractsList);
      
      // Adjust page if current page becomes empty after deletion
      const totalPages = Math.ceil(updatedContractsList.length / itemsPerPage);
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
      } else if (updatedContractsList.length === 0) {
        setCurrentPage(1);
      }
      
      setDeleteConfirm({ open: false, contractId: null, contractName: '' });
      setStatus({ state: 'success', message: 'Contract deleted successfully!' });
      setTimeout(() => setStatus({ state: 'idle', message: '' }), 2000);
    } catch (err) {
      console.error('Error deleting contract:', err);
      setDeleteConfirm({ open: false, contractId: null, contractName: '' });
      setStatus({ state: 'error', message: 'Unable to delete contract. Please try again.' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      setStatus({ state: 'error', message: 'Please fix the highlighted fields.' });
      return;
    }

    setStatus({ state: 'loading', message: editingContractId ? 'Updating contract...' : 'Saving contract...' });
    setSaving(true);
    setErrors({});

    try {
      // Map form data to MySQL schema
      const contractData = {
        name: form.employeeName.trim(),
        position: form.position.trim(),
        assessmentDate: form.assessmentDate ? new Date(form.assessmentDate).toISOString() : null,
        basicSalary: parseInt(form.basicSalary, 10),
        termMonths: parseInt(form.term, 10),
        allowance: form.allowance ? parseInt(form.allowance, 10) : null,
        attendanceBonus: attendanceBonusAmount > 0 ? attendanceBonusAmount : null,
        fullAttendanceBonus: perfectAttendanceAmount > 0 ? perfectAttendanceAmount : null,
        signingBonus: form.signingBonus ? String(form.signingBonus) : null,
        resignationDate: form.resignationNote ? new Date().toISOString() : null,
      };

      if (editingContractId) {
        // Update existing contract
        await updateContract(editingContractId, contractData);
        setStatus({ state: 'success', message: 'Contract updated successfully!' });
      } else {
        // Create new contract
        await submitContract(contractData);
        setStatus({ state: 'success', message: 'Contract saved successfully!' });
      }
      
      setSaving(false);
      reset();
      setEditingContractId(null);
      setErrors({});
      
      // Reload contracts list
      await loadContracts();
      
      // Reset to first page after reload
      setCurrentPage(1);
      
      // Close modal after short delay
      setTimeout(() => {
        setOpen(false);
        setStatus({ state: 'idle', message: '' });
      }, 1500);
    } catch (err) {
      setSaving(false);
      console.error('Error submitting contract:', err);
      
      // Handle validation errors from API
      if (err.errors && Array.isArray(err.errors)) {
        const apiErrors = {};
        err.errors.forEach((errorMsg) => {
          // Map API error messages to form fields
          if (errorMsg.includes('name')) apiErrors.employeeName = errorMsg;
          else if (errorMsg.includes('position')) apiErrors.position = errorMsg;
          else if (errorMsg.includes('assessment_date')) apiErrors.assessmentDate = errorMsg;
          else if (errorMsg.includes('basic_salary')) apiErrors.basicSalary = errorMsg;
          else if (errorMsg.includes('term_months')) apiErrors.term = errorMsg;
        });
        setErrors(apiErrors);
      }
      
      setStatus({ 
        state: 'error', 
        message: err.message || 'Unable to save contract. Please check the form and try again.' 
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Gmail-style toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-[#f1f3f4]">
        <button 
          onClick={() => {
            reset();
            setEditingContractId(null);
            setOpen(true);
            setStatus({ state: 'idle', message: '' });
            setErrors({});
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#c2e7ff] hover:bg-[#a8d8f0] text-[#001d35] rounded-full font-medium transition-colors shadow-sm"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>New Contract</span>
        </button>
        <button 
          onClick={loadContracts} 
          disabled={loading}
          className="p-2 hover:bg-[#eaebef] rounded-full transition-colors text-[#5f6368] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh contracts"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            className={loading ? 'animate-spin' : ''}
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
        <button className="p-2 hover:bg-[#eaebef] rounded-full transition-colors text-[#5f6368]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>

        <div className="ml-auto flex items-center gap-1 text-xs text-[#5f6368]">
          <span>
            {(() => {
              const filteredContracts = contracts.filter((contract) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return (
                  contract.name?.toLowerCase().includes(query) ||
                  contract.position?.toLowerCase().includes(query) ||
                  contract.termMonths?.toString().includes(query) ||
                  formatDate(contract.assessmentDate)?.toLowerCase().includes(query)
                );
              });
              const filteredLength = filteredContracts.length;
              const totalPages = Math.ceil(filteredLength / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              
              return filteredLength > 0 
                ? `${startIndex + 1}-${Math.min(endIndex, filteredLength)} of ${filteredLength}`
                : `0-0 of 0`;
            })()}
          </span>
          <button className="p-2 hover:bg-[#eaebef] rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button className="p-2 hover:bg-[#eaebef] rounded-full">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

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
          <div className="w-full">
            {/* Column Headers */}
            <div className="flex items-center gap-4 px-4 py-2 border-b border-[#dadce0] bg-[#f8f9fa] text-xs font-medium text-[#5f6368] uppercase tracking-wider">
              <div className="w-40">Name</div>
              <div className="w-36">Position</div>
              <div className="w-20">Term</div>
              <div className="w-24">Assessment</div>
              <div className="flex-1">Status</div>
              <div className="flex items-center gap-4 ml-auto">
                <div className="w-24 text-right">Salary</div>
                <div className="w-24 text-right">Expiration</div>
                <div className="w-20 text-center">Actions</div>
              </div>
            </div>
            
            {(() => {
              // Filter contracts based on search query
              const filteredContracts = contracts.filter((contract) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return (
                  contract.name?.toLowerCase().includes(query) ||
                  contract.position?.toLowerCase().includes(query) ||
                  contract.termMonths?.toString().includes(query) ||
                  formatDate(contract.assessmentDate)?.toLowerCase().includes(query)
                );
              });
              
              if (filteredContracts.length === 0 && searchQuery.trim()) {
                return (
                  <div className="p-8 text-center text-[#5f6368]">
                    <p className="text-lg">No contracts found</p>
                    <p className="text-sm">Try adjusting your search query.</p>
                  </div>
                );
              }
              
              const totalPages = Math.ceil(filteredContracts.length / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedContracts = filteredContracts.slice(startIndex, endIndex);
              
              // Reset to page 1 if current page is out of bounds after filtering
              if (currentPage > totalPages && totalPages > 0) {
                setCurrentPage(1);
              }
              
              return (
                <>
                  {paginatedContracts.map((contract) => {
               const contractTotalSalary = 
               (contract.basicSalary || 0) +
               (contract.allowance || 0) +
               (contract.attendanceBonus || 0) +
               (contract.fullAttendanceBonus || 0) +
               (Number(contract.signingBonus) || 0);

               // Determine label based on contract status (recalculates in real-time)
               const getLabel = () => {
                 if (contract.resignationDate) {
                   return { text: 'Terminated', color: 'bg-[#fce8e6] text-[#c5221f]' };
                 }
                 
                 // Always calculate expiration date from assessmentDate + termMonths for accuracy
                 // This ensures status updates correctly when assessment date changes in database
                 let expirationDate;
                 if (contract.assessmentDate && contract.termMonths) {
                   // Parse assessment date (handle both ISO string and date object)
                   const assessmentDateStr = contract.assessmentDate;
                   let assessmentDate;
                   if (typeof assessmentDateStr === 'string') {
                     // Handle ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)
                     assessmentDate = new Date(assessmentDateStr.includes('T') 
                       ? assessmentDateStr 
                       : assessmentDateStr + 'T00:00:00');
                   } else {
                     assessmentDate = new Date(assessmentDateStr);
                   }
                   
                   // Calculate expiration: assessment date + term months
                   expirationDate = new Date(assessmentDate);
                   expirationDate.setMonth(expirationDate.getMonth() + parseInt(contract.termMonths));
                 } else if (contract.expirationDate) {
                   // Fallback to stored expiration date if calculation not possible
                   expirationDate = new Date(contract.expirationDate);
                 } else {
                   // No expiration date available, default to Active
                   return { text: 'Active', color: 'bg-[#e6f4ea] text-[#1e8e3e]' };
                 }
                 
                 // Normalize dates to midnight for accurate day comparison
                 const today = new Date(currentTime);
                 today.setHours(0, 0, 0, 0);
                 const expiry = new Date(expirationDate);
                 expiry.setHours(0, 0, 0, 0);
                 
                 const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                 
                 if (daysUntilExpiry < 0) {
                   return { text: 'Expired', color: 'bg-[#fce8e6] text-[#c5221f]' };
                 }
                 if (daysUntilExpiry <= 30) {
                   return { text: 'Expiring Soon', color: 'bg-[#fef7e0] text-[#ea8600]' };
                 }
                 return { text: 'Active', color: 'bg-[#e6f4ea] text-[#1e8e3e]' };
               };

               const label = getLabel();

               // Calculate expiration date for display
               const getExpirationDateDisplay = () => {
                 if (contract.assessmentDate && contract.termMonths) {
                   const assessmentDateStr = contract.assessmentDate;
                   let assessmentDate;
                   if (typeof assessmentDateStr === 'string') {
                     assessmentDate = new Date(assessmentDateStr.includes('T') 
                       ? assessmentDateStr 
                       : assessmentDateStr + 'T00:00:00');
                   } else {
                     assessmentDate = new Date(assessmentDateStr);
                   }
                   const expirationDate = new Date(assessmentDate);
                   expirationDate.setMonth(expirationDate.getMonth() + parseInt(contract.termMonths));
                   return formatDate(expirationDate);
                 }
                 return contract.expirationDate ? formatDate(contract.expirationDate) : 'N/A';
               };

               return (
                 <div 
                   key={contract.id}
                   className="flex items-center gap-4 px-4 py-3 border-b border-[#f1f3f4] hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] hover:z-10 cursor-pointer group"
                 >
                   <div className="w-40 font-bold text-[#202124] truncate">
                     {contract.name}
                   </div>

                   <div className="w-36 text-[#202124] truncate">
                     {contract.position}
                   </div>

                   <div className="w-20 text-[#5f6368]">
                     {contract.termMonths} mo
                   </div>

                   <div className="w-24 text-[#5f6368] text-sm">
                     {formatDate(contract.assessmentDate)}
                   </div>

                   <div className="flex-1">
                     <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${label.color}`}>
                       {label.text}
                     </span>
                   </div>

                   <div className="flex items-center gap-4 ml-auto">
                      <div className="w-24 text-right font-bold text-[#202124]">
                        ₱{contractTotalSalary.toLocaleString()}
                      </div>
                      <div className="w-24 text-right text-sm text-[#5f6368]">
                        {getExpirationDateDisplay()}
                      </div>
                      <div className="w-20 flex items-center justify-center gap-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            loadContractForEdit(contract.id);
                          }}
                          className="p-2 hover:bg-[#eaebef] rounded-full text-[#5f6368] transition-colors"
                          title="Edit Contract"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(contract.id, contract.name);
                          }}
                          className="p-2 hover:bg-[#eaebef] rounded-full text-[#5f6368] transition-colors"
                          title="Delete Contract"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                   </div>
                 </div>
               );
                  })}
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-[#f1f3f4] bg-[#f8f9fa]">
                      <div className="text-sm text-[#5f6368]">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredContracts.length)} of {filteredContracts.length} {searchQuery ? 'filtered ' : ''}contracts
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 hover:bg-[#eaebef] rounded-full text-[#5f6368] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Previous page"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m15 18-6-6 6-6" />
                          </svg>
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                            // Show first page, last page, current page, and pages around current
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                    currentPage === page
                                      ? 'bg-[#1a73e8] text-white'
                                      : 'text-[#5f6368] hover:bg-[#eaebef]'
                                  }`}
                                >
                                  {page}
                                </button>
                              );
                            } else if (
                              page === currentPage - 2 ||
                              page === currentPage + 2
                            ) {
                              return (
                                <span key={page} className="px-1 text-[#5f6368]">
                                  ...
                                </span>
                              );
                            }
                            return null;
                          })}
                        </div>
                        
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 hover:bg-[#eaebef] rounded-full text-[#5f6368] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Next page"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m9 18 6-6-6-6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => {
        setOpen(false);
        setEditingContractId(null);
        reset();
        setStatus({ state: 'idle', message: '' });
        setErrors({});
      }} title={editingContractId ? "Edit Contract" : "New Contract"}>
        <form className="p-4 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee Name" required error={errors.employeeName}>
                <input
                  required
                  value={form.employeeName}
                  onChange={(e) => updateField('employeeName', e.target.value)}
                  placeholder="Recipient"
                  className={`w-full border-b py-2 focus:outline-none transition-colors ${
                    errors.employeeName 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-[#f1f3f4] focus:border-[#1a73e8]'
                  }`}
                />
              </Field>
              <Field label="Position" required error={errors.position}>
                <input
                  required
                  value={form.position}
                  onChange={(e) => updateField('position', e.target.value)}
                  placeholder="Subject"
                  className={`w-full border-b py-2 focus:outline-none transition-colors ${
                    errors.position 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-[#f1f3f4] focus:border-[#1a73e8]'
                  }`}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Assessment Date" required error={errors.assessmentDate}>
                <input
                  type="date"
                  required
                  value={form.assessmentDate}
                  onChange={(e) => updateField('assessmentDate', e.target.value)}
                  className={`w-full border-b py-2 focus:outline-none transition-colors ${
                    errors.assessmentDate 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-[#f1f3f4] focus:border-[#1a73e8]'
                  }`}
                />
              </Field>
              <Field label="Term (Months)" required error={errors.term}>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.term}
                  onChange={(e) => updateField('term', e.target.value)}
                  className={`w-full border-b py-2 focus:outline-none transition-colors ${
                    errors.term 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-[#f1f3f4] focus:border-[#1a73e8]'
                  }`}
                />
              </Field>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#f1f3f4]">
               <p className="text-sm font-medium text-[#5f6368]">Financials</p>
               <div className="grid grid-cols-3 gap-4">
                  <Field label="Basic Salary" error={errors.basicSalary}>
                    <input
                      type="number"
                      value={form.basicSalary}
                      onChange={(e) => updateField('basicSalary', e.target.value)}
                      className={`w-full bg-[#f8f9fa] rounded px-3 py-2 outline-none focus:ring-1 ${
                        errors.basicSalary 
                          ? 'border border-rose-500 focus:ring-rose-500' 
                          : 'focus:ring-[#1a73e8]'
                      }`}
                    />
                  </Field>
                  <Field label="Allowance" error={errors.allowance}>
                    <input
                      type="number"
                      value={form.allowance}
                      onChange={(e) => updateField('allowance', e.target.value)}
                      className={`w-full bg-[#f8f9fa] rounded px-3 py-2 outline-none focus:ring-1 ${
                        errors.allowance 
                          ? 'border border-rose-500 focus:ring-rose-500' 
                          : 'focus:ring-[#1a73e8]'
                      }`}
                    />
                  </Field>
                  <Field label="Signing Bonus" error={errors.signingBonus}>
                    <input
                      type="number"
                      value={form.signingBonus}
                      onChange={(e) => updateField('signingBonus', e.target.value)}
                      className={`w-full bg-[#f8f9fa] rounded px-3 py-2 outline-none focus:ring-1 ${
                        errors.signingBonus 
                          ? 'border border-rose-500 focus:ring-rose-500' 
                          : 'focus:ring-[#1a73e8]'
                      }`}
                    />
                  </Field>
               </div>
               
               <div className="grid grid-cols-2 gap-4 pt-2">
                  <Field label="Attendance Bonus (%)" error={errors.attendanceBonusPercent}>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.attendanceBonusPercent}
                        onChange={(e) => updateField('attendanceBonusPercent', e.target.value)}
                        placeholder="0"
                        className={`flex-1 bg-[#f8f9fa] rounded px-3 py-2 outline-none focus:ring-1 ${
                          errors.attendanceBonusPercent 
                            ? 'border border-rose-500 focus:ring-rose-500' 
                            : 'focus:ring-[#1a73e8]'
                        }`}
                      />
                      <div className="text-sm text-[#5f6368] min-w-[80px]">
                        = ₱{attendanceBonusAmount.toFixed(2)}
                      </div>
                    </div>
                  </Field>
                  <Field label="Perfect Attendance (%)" error={errors.perfectAttendancePercent}>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.perfectAttendancePercent}
                        onChange={(e) => updateField('perfectAttendancePercent', e.target.value)}
                        placeholder="0"
                        className={`flex-1 bg-[#f8f9fa] rounded px-3 py-2 outline-none focus:ring-1 ${
                          errors.perfectAttendancePercent 
                            ? 'border border-rose-500 focus:ring-rose-500' 
                            : 'focus:ring-[#1a73e8]'
                        }`}
                      />
                      <div className="text-sm text-[#5f6368] min-w-[80px]">
                        = ₱{perfectAttendanceAmount.toFixed(2)}
                      </div>
                    </div>
                  </Field>
               </div>
               
               <div className="pt-2">
                  <div className="rounded-lg border border-[#e8f0fe] bg-[#e8f0fe] px-4 py-3">
                    <p className="text-xs uppercase tracking-wider text-[#1a73e8] font-medium mb-1">Total Salary</p>
                    <p className="text-2xl font-bold text-[#1a73e8]">₱{totalSalary.toFixed(2)}</p>
                  </div>
               </div>
            </div>

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
                  onClick={() => {
                    setOpen(false);
                    setEditingContractId(null);
                    reset();
                    setErrors({});
                    setStatus({ state: 'idle', message: '' });
                  }}
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

      {/* Delete Confirmation Modal */}
      <Modal 
        open={deleteConfirm.open} 
        onClose={() => setDeleteConfirm({ open: false, contractId: null, contractName: '' })} 
        title="Delete Contract"
      >
        <div className="p-6">
          <p className="text-[#202124] mb-6">
            Are you sure you want to delete the contract for <strong>{deleteConfirm.contractName}</strong>? 
            This action cannot be undone.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setDeleteConfirm({ open: false, contractId: null, contractName: '' })}
              className="px-4 py-2 border border-[#dadce0] hover:bg-[#f8f9fa] text-[#5f6368] rounded-full font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-[#ea4335] hover:bg-[#d33b2c] text-white rounded-full font-medium transition-colors shadow-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ContractForm;
