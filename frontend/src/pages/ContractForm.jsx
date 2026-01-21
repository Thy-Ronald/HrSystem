import { useEffect, useState } from 'react';
import SectionCard from '../components/SectionCard';
import { submitContract, fetchContracts } from '../services/api';
import { useContractCalculator } from '../hooks/useContractCalculator';
import { formatDate } from '../utils/format';

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
      .then(setContracts)
      .catch(() => setContracts([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      const latest = await fetchContracts();
      setContracts(latest);
    } catch (err) {
      setStatus({ state: 'error', message: err.message || 'Unable to save contract' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-[0.25em] text-brand-600">HR System</p>
          <h1 className="text-3xl font-bold text-slate-900">Employee Contract Form</h1>
          <p className="text-sm text-slate-600">
            Create and review employee contracts with real-time salary breakdowns.
          </p>
        </header>

        <form className="grid grid-cols-1 gap-6 lg:grid-cols-3" onSubmit={handleSubmit}>
          <SectionCard
            title="Employee Info"
            description="Core contract details."
            className="lg:col-span-2"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Employee Name" required>
                <input
                  required
                  value={form.employeeName}
                  onChange={(e) => updateField('employeeName', e.target.value)}
                  placeholder="INTO, PETER ANDREW"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>
              <Field label="Position" required>
                <input
                  required
                  value={form.position}
                  onChange={(e) => updateField('position', e.target.value)}
                  placeholder="Software Developer"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Employment Date / Date Hired" required>
                <input
                  type="date"
                  required
                  value={form.employmentDate}
                  onChange={(e) => updateField('employmentDate', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>
              <Field label="Assessment Date" required>
                <input
                  type="date"
                  required
                  value={form.assessmentDate}
                  onChange={(e) => updateField('assessmentDate', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Contract Type" required>
                <input
                  required
                  value={form.contractType}
                  onChange={(e) => updateField('contractType', e.target.value)}
                  placeholder="Contract 2"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>
              <Field label="Term" required>
                <input
                  required
                  value={form.term}
                  onChange={(e) => updateField('term', e.target.value)}
                  placeholder="1 year"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>
              <Field label="Expiration Date" required>
                <input
                  type="date"
                  required
                  value={form.expirationDate}
                  onChange={(e) => updateField('expirationDate', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
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
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Salary Breakdown" description="Auto-calculated components.">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Basic Salary" required>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.basicSalary}
                  onChange={(e) => updateField('basicSalary', e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>
              <Field label="Allowance">
                <input
                  type="number"
                  min="0"
                  value={form.allowance}
                  onChange={(e) => updateField('allowance', e.target.value)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Attendance Bonus (%)">
                  <input
                    type="number"
                    min="0"
                    value={form.attendanceBonusPercent}
                    onChange={(e) => updateField('attendanceBonusPercent', e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
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
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
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
                <p className="text-2xl font-bold text-emerald-900">${totalSalary.toFixed(2)}</p>
              </div>
            </div>
          </SectionCard>

          <div className="lg:col-span-3 flex flex-wrap items-center gap-3">
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
        </form>

        <SectionCard
          title="Contracts"
          description="Recently created contracts."
        >
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
                    ${Number(contract.totalSalary || 0).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default ContractForm;
