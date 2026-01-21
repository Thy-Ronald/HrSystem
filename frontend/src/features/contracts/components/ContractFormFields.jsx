/**
 * Form field component with error handling
 */
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

/**
 * Contract form fields component
 */
export function ContractFormFields({ 
  form, 
  updateField, 
  errors, 
  attendanceBonusAmount, 
  perfectAttendanceAmount, 
  totalSalary 
}) {
  return (
    <>
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
    </>
  );
}
