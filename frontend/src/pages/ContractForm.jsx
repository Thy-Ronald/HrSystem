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

  const {
    form,
    updateField,
    attendanceBonusAmount,
    perfectAttendanceAmount,
    totalSalary,
    reset,
  } = useContractCalculator();

  useEffect(() => {
    fetchContracts()
      .then((data) => {
        setContracts(data);
        setLoadError('');
      })
      .catch(() => {
        setContracts([]);
        setLoadError('Unable to load contracts. Please try again.');
      });
  }, []);

  const validate = () => {
    const next = {};

    const requiredFields = [
      ['employeeName', 'Employee Name'],
      ['position', 'Position'],
      ['employmentDate', 'Employment Date / Date Hired'],
      ['assessmentDate', 'Assessment Date'],
      ['contractType', 'Contract Type'],
      ['term', 'Term'],
      ['expirationDate', 'Expiration Date'],
      ['basicSalary', 'Basic Salary'],
    ];

    for (const [key, label] of requiredFields) {
      if (!String(form[key] ?? '').trim()) next[key] = `${label} is required`;
    }

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
      if (Number.isFinite(value) && (value < 0 || value > 100)) next[key] = `${label} must be between 0 and 100`;
    };

    percent('attendanceBonusPercent', 'Attendance Bonus (%)');
    percent('perfectAttendancePercent', 'Perfect Attendance (%)');

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      setStatus({ state: 'error', message: 'Please fix the highlighted fields.' });
      return;
    }
    setStatus({ state: 'loading', message: '' });
    try {
      await submitContract({
        ...form,
        attendanceBonusAmount,
        perfectAttendanceAmount,
        totalSalary,
      });
      setStatus({ state: 'success', message: 'Contract saved' });
      reset();
      setErrors({});
      const latest = await fetchContracts();
      setContracts(latest);
      setOpen(false);
    } catch (err) {
      setStatus({ state: 'error', message: err.message || 'Unable to save contract' });
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
            onClick={() => setOpen(true)}
            className="w-fit rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
          >
            New Contract
          </button>
        </header>

        <SectionCard title="Contracts" description="Recently created contracts.">
          {loadError && <p className="mb-3 text-sm text-rose-600">{loadError}</p>}
          {contracts.length === 0 ? (
            <p className="text-sm text-slate-600">No contracts yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-900">{contract.employeeName}</p>
                    <span className="text-xs text-slate-500">{formatDate(contract.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600">{contract.position}</p>
                  <p className="text-sm text-slate-600">
                    {contract.contractType} • {contract.term}
                  </p>
                  <p className="text-sm font-semibold text-emerald-700">
                    {Number(contract.totalSalary || 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create Contract">
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
                      placeholder="INTO, PETER ANDREW"
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
                      placeholder="Software Developer"
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
                  <Field label="Employment Date / Date Hired" required>
                    <input
                      type="date"
                      required
                      value={form.employmentDate}
                      onChange={(e) => updateField('employmentDate', e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.employmentDate
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.employmentDate && (
                      <span className="mt-1 text-xs text-rose-600">{errors.employmentDate}</span>
                    )}
                  </Field>
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
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-800">Contract Details</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Contract Type" required>
                    <input
                      required
                      value={form.contractType}
                      onChange={(e) => updateField('contractType', e.target.value)}
                      placeholder="Contract 2"
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.contractType
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.contractType && (
                      <span className="mt-1 text-xs text-rose-600">{errors.contractType}</span>
                    )}
                  </Field>
                  <Field label="Term" required>
                    <input
                      required
                      value={form.term}
                      onChange={(e) => updateField('term', e.target.value)}
                      placeholder="1 year"
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.term
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.term && <span className="mt-1 text-xs text-rose-600">{errors.term}</span>}
                  </Field>
                  <Field label="Expiration Date" required>
                    <input
                      type="date"
                      required
                      value={form.expirationDate}
                      onChange={(e) => updateField('expirationDate', e.target.value)}
                      className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                        errors.expirationDate
                          ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-100'
                          : 'border-slate-200 focus:border-brand-500 focus:ring-brand-100'
                      }`}
                    />
                    {errors.expirationDate && (
                      <span className="mt-1 text-xs text-rose-600">{errors.expirationDate}</span>
                    )}
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Resignation (optional)">
                    <input
                      value={form.resignationNote}
                      onChange={(e) => updateField('resignationNote', e.target.value)}
                      placeholder="Notes about resignation status"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </Field>
                  <Field label="Current Offer">
                    <select
                      value={form.currentOffer}
                      onChange={(e) => updateField('currentOffer', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </Field>
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

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">Total Salary</p>
                    <p className="text-2xl font-bold text-emerald-900">{totalSalary.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  disabled={status.state === 'loading'}
                >
                  {status.state === 'loading' ? 'Saving...' : 'Save Contract'}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Clear
                </button>
                {status.state !== 'idle' && (
                  <span
                    className={`text-sm ${
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
