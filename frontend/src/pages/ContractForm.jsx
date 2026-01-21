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
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-brand-600">HR System</p>
            <h1 className="text-3xl font-bold text-slate-900">Employee Contract Form</h1>
            <p className="text-sm text-slate-600">
              Create and review employee contracts with real-time salary breakdowns.
            </p>
          </div>
          <button
            onClick={() => {
              setOpen(true);
              setStatus({ state: 'idle', message: '' });
              setErrors({});
            }}
            className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            New Contract
          </button>
        </header>

        <SectionCard title="Employee List" description="All employee contracts.">
          {loading && <p className="mb-3 text-sm text-slate-600">Loading contracts...</p>}
          {loadError && <p className="mb-3 text-sm text-rose-600">{loadError}</p>}
          {!loading && contracts.length === 0 && !loadError && (
            <p className="text-sm text-slate-600">No contracts yet. Create your first contract above.</p>
          )}
          {!loading && contracts.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 font-semibold text-slate-700">Employee Name</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Position</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Assessment Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Term (Months)</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Expiration Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-right">Basic Salary</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 text-right">Total Salary</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => {
                    // Calculate total salary from contract data
                    const contractTotalSalary = 
                      (contract.basicSalary || 0) +
                      (contract.allowance || 0) +
                      (contract.attendanceBonus || 0) +
                      (contract.fullAttendanceBonus || 0) +
                      (Number(contract.signingBonus) || 0);

                    return (
                      <tr
                        key={contract.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{contract.name}</td>
                        <td className="px-4 py-3 text-slate-600">{contract.position}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatDate(contract.assessmentDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{contract.termMonths} months</td>
                        <td className="px-4 py-3 text-slate-600">
                          {contract.expirationDate ? formatDate(contract.expirationDate) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {Number(contract.basicSalary || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                          {contractTotalSalary.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatDate(contract.createdDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      <Modal open={open} onClose={() => {
        setOpen(false);
        setStatus({ state: 'idle', message: '' });
        setErrors({});
      }} title="Create Contract">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <SectionCard showKicker={false}>
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-800">Employee Info</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Employee Name" required>
                    <input
                      required
                      value={form.employeeName}
                      onChange={(e) => updateField('employeeName', e.target.value)}
                      placeholder="John Doe"
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.employeeName
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.employeeName && (
                      <span className="mt-1 text-xs text-rose-600">{errors.employeeName}</span>
                    )}
                  </Field>
                  <Field label="Position" required>
                    <input
                      required
                      value={form.position}
                      onChange={(e) => updateField('position', e.target.value)}
                      placeholder="Software Engineer"
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.position
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.position && (
                      <span className="mt-1 text-xs text-rose-600">{errors.position}</span>
                    )}
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Assessment Date" required>
                    <input
                      type="date"
                      required
                      value={form.assessmentDate}
                      onChange={(e) => updateField('assessmentDate', e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.assessmentDate
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.assessmentDate && (
                      <span className="mt-1 text-xs text-rose-600">{errors.assessmentDate}</span>
                    )}
                  </Field>
                  <Field label="Term (Months)" required>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.term}
                      onChange={(e) => updateField('term', e.target.value)}
                      placeholder="12"
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.term
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.term && (
                      <span className="mt-1 text-xs text-rose-600">{errors.term}</span>
                    )}
                  </Field>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-800">Salary Breakdown</p>
                <div className="grid grid-cols-1 gap-4">
                  <Field label="Basic Salary" required>
                    <input
                      type="number"
                      min="0"
                      required
                      value={form.basicSalary}
                      onChange={(e) => updateField('basicSalary', e.target.value)}
                      placeholder="0"
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.basicSalary
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.basicSalary && (
                      <span className="mt-1 text-xs text-rose-600">{errors.basicSalary}</span>
                    )}
                  </Field>
                  <Field label="Allowance">
                    <input
                      type="number"
                      min="0"
                      value={form.allowance}
                      onChange={(e) => updateField('allowance', e.target.value)}
                      placeholder="0"
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.allowance
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.allowance && (
                      <span className="mt-1 text-xs text-rose-600">{errors.allowance}</span>
                    )}
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Attendance Bonus (%)">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.attendanceBonusPercent}
                        onChange={(e) => updateField('attendanceBonusPercent', e.target.value)}
                        placeholder="0"
                        className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                          errors.attendanceBonusPercent
                            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                            : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                        }`}
                      />
                      {errors.attendanceBonusPercent && (
                        <span className="mt-1 text-xs text-rose-600">{errors.attendanceBonusPercent}</span>
                      )}
                    </Field>
                    <Field label="Attendance Bonus Amount">
                      <input
                        readOnly
                        value={attendanceBonusAmount.toFixed(2)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Perfect Attendance (%)">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.perfectAttendancePercent}
                        onChange={(e) => updateField('perfectAttendancePercent', e.target.value)}
                        placeholder="0"
                        className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                          errors.perfectAttendancePercent
                            ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                            : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                        }`}
                      />
                      {errors.perfectAttendancePercent && (
                        <span className="mt-1 text-xs text-rose-600">{errors.perfectAttendancePercent}</span>
                      )}
                    </Field>
                    <Field label="Perfect Attendance Amount">
                      <input
                        readOnly
                        value={perfectAttendanceAmount.toFixed(2)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700"
                      />
                    </Field>
                  </div>

                  <Field label="Signing Bonus">
                    <input
                      type="number"
                      min="0"
                      value={form.signingBonus}
                      onChange={(e) => updateField('signingBonus', e.target.value)}
                      placeholder="0"
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.signingBonus
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.signingBonus && (
                      <span className="mt-1 text-xs text-rose-600">{errors.signingBonus}</span>
                    )}
                  </Field>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Total Salary</p>
                    <p className="text-2xl font-bold text-emerald-900">{totalSalary.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={status.state === 'loading'}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status.state === 'loading' ? 'Saving...' : 'Save Contract'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setErrors({});
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </button>
                {status.state !== 'idle' && (
                  <span
                    className={`text-sm font-medium ${
                      status.state === 'error' ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {status.message}
                  </span>
                )}
              </div>
            </div>
          </SectionCard>
        </form>
      </Modal>
    </div>
  );
}

export default ContractForm;
