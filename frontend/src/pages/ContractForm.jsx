import { useEffect, useState } from 'react';
import SectionCard from '../components/SectionCard';
import { submitContract, fetchContracts } from '../services/api';
import { useContractCalculator } from '../hooks/useContractCalculator';
import { formatDate } from '../utils/format';
import Modal from '../components/Modal';

function Field({ label, children, required }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
    </label>
  );
}

function ContractForm() {
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [contracts, setContracts] = useState([]);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);

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

  // Listen for modal open event from Layout
  useEffect(() => {
    const handleOpenModal = () => {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      setStatus({ state: 'error', message: 'Please fix the highlighted fields.' });
      return;
    }

    setStatus({ state: 'loading', message: 'Saving contract...' });
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

      await submitContract(contractData);
      setStatus({ state: 'success', message: 'Contract saved successfully!' });
      reset();
      setErrors({});
      
      // Reload contracts list
      await loadContracts();
      
      // Close modal after short delay
      setTimeout(() => {
        setOpen(false);
        setStatus({ state: 'idle', message: '' });
      }, 1500);
    } catch (err) {
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
        <div className="flex items-center px-2 py-2 hover:bg-[#eaebef] rounded cursor-pointer">
          <input type="checkbox" className="w-4 h-4 border-[#5f6368] rounded-sm" />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" className="ml-1">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <button 
          onClick={() => {
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
        <button onClick={loadContracts} className="p-2 hover:bg-[#eaebef] rounded-full transition-colors text-[#5f6368]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
          <span>1-50 of {contracts.length}</span>
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
            {contracts.map((contract) => {
               const contractTotalSalary = 
               (contract.basicSalary || 0) +
               (contract.allowance || 0) +
               (contract.attendanceBonus || 0) +
               (contract.fullAttendanceBonus || 0) +
               (Number(contract.signingBonus) || 0);

               return (
                 <div 
                   key={contract.id}
                   className="flex items-center gap-4 px-4 py-3 border-b border-[#f1f3f4] hover:shadow-[inset_1px_0_0_#dadce0,inset_-1px_0_0_#dadce0,0_1px_2px_0_rgba(60,64,67,.3),0_1px_3px_1px_rgba(60,64,67,.15)] hover:z-10 cursor-pointer group"
                 >
                   <div className="flex items-center gap-3">
                     <input type="checkbox" className="w-4 h-4 border-[#dadce0] rounded-sm" />
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dadce0" strokeWidth="2" className="group-hover:stroke-[#5f6368]">
                       <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                     </svg>
                   </div>

                   <div className="w-48 font-bold text-[#202124] truncate">
                     {contract.name}
                   </div>

                   <div className="flex-1 flex items-center gap-2 overflow-hidden">
                     <span className="text-[#202124] font-medium">{contract.position}</span>
                     <span className="text-[#5f6368]">—</span>
                     <span className="text-[#5f6368] truncate">
                       {contract.termMonths} months • {formatDate(contract.assessmentDate)}
                     </span>
                   </div>

                   <div className="flex items-center gap-4 ml-auto">
                      <div className="hidden group-hover:flex items-center gap-2">
                        <button className="p-2 hover:bg-[#eaebef] rounded-full text-[#5f6368]">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                        <button className="p-2 hover:bg-[#eaebef] rounded-full text-[#5f6368]">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                          </svg>
                        </button>
                      </div>
                      <div className="w-24 text-right font-bold text-[#202124]">
                        ${contractTotalSalary.toLocaleString()}
                      </div>
                      <div className="w-20 text-right text-xs text-[#5f6368]">
                        {formatDate(contract.createdDate)}
                      </div>
                   </div>
                 </div>
               );
            })}
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => {
        setOpen(false);
        setStatus({ state: 'idle', message: '' });
        setErrors({});
      }} title="New Contract">
        <form className="p-4 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee Name" required>
                <input
                  required
                  value={form.employeeName}
                  onChange={(e) => updateField('employeeName', e.target.value)}
                  placeholder="Recipient"
                  className="w-full border-b border-[#f1f3f4] py-2 focus:border-[#1a73e8] outline-none transition-colors"
                />
              </Field>
              <Field label="Position" required>
                <input
                  required
                  value={form.position}
                  onChange={(e) => updateField('position', e.target.value)}
                  placeholder="Subject"
                  className="w-full border-b border-[#f1f3f4] py-2 focus:border-[#1a73e8] outline-none transition-colors"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Assessment Date" required>
                <input
                  type="date"
                  required
                  value={form.assessmentDate}
                  onChange={(e) => updateField('assessmentDate', e.target.value)}
                  className="w-full border-b border-[#f1f3f4] py-2 focus:border-[#1a73e8] outline-none transition-colors"
                />
              </Field>
              <Field label="Term (Months)" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.term}
                  onChange={(e) => updateField('term', e.target.value)}
                  className="w-full border-b border-[#f1f3f4] py-2 focus:border-[#1a73e8] outline-none transition-colors"
                />
              </Field>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#f1f3f4]">
               <p className="text-sm font-medium text-[#5f6368]">Financials</p>
               <div className="grid grid-cols-3 gap-4">
                  <Field label="Basic Salary">
                    <input
                      type="number"
                      value={form.basicSalary}
                      onChange={(e) => updateField('basicSalary', e.target.value)}
                      className="w-full bg-[#f8f9fa] rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#1a73e8]"
                    />
                  </Field>
                  <Field label="Allowance">
                    <input
                      type="number"
                      value={form.allowance}
                      onChange={(e) => updateField('allowance', e.target.value)}
                      className="w-full bg-[#f8f9fa] rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#1a73e8]"
                    />
                  </Field>
                  <Field label="Signing Bonus">
                    <input
                      type="number"
                      value={form.signingBonus}
                      onChange={(e) => updateField('signingBonus', e.target.value)}
                      className="w-full bg-[#f8f9fa] rounded px-3 py-2 outline-none focus:ring-1 focus:ring-[#1a73e8]"
                    />
                  </Field>
               </div>
            </div>

            <div className="flex items-center justify-between pt-6">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={status.state === 'loading'}
                  className="bg-[#1a73e8] hover:bg-[#1b66c9] text-white px-6 py-2 rounded-full font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {status.state === 'loading' ? 'Sending...' : 'Send Contract'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setErrors({});
                  }}
                  className="p-2 hover:bg-[#f1f3f4] rounded-full transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
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
    </div>
  );
}

export default ContractForm;
