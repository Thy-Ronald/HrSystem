/**
 * Form field component with error handling
 */
function Field({ label, children, required, error }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-[#202124] font-medium">
        {label}
        {required && <span className="text-rose-500 ml-1">*</span>}
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
    <div className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-[#202124] border-b border-[#e8eaed] pb-2">
          Basic Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee Name" required error={errors.employeeName}>
            <input
              required
              value={form.employeeName}
              onChange={(e) => updateField('employeeName', e.target.value)}
              placeholder="Enter employee name"
              className={`w-full border rounded-lg px-4 py-2.5 text-[#202124] bg-white transition-all ${
                errors.employeeName 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-200' 
                  : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#e8f0fe]'
              } outline-none`}
            />
          </Field>
          <Field label="Position" required error={errors.position}>
            <input
              required
              value={form.position}
              onChange={(e) => updateField('position', e.target.value)}
              placeholder="Enter position"
              className={`w-full border rounded-lg px-4 py-2.5 text-[#202124] bg-white transition-all ${
                errors.position 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-200' 
                  : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#e8f0fe]'
              } outline-none`}
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
              className={`w-full border rounded-lg px-4 py-2.5 text-[#202124] bg-white transition-all ${
                errors.assessmentDate 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-200' 
                  : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#e8f0fe]'
              } outline-none`}
            />
          </Field>
          <Field label="Term (Months)" required error={errors.term}>
            <input
              type="number"
              min="1"
              required
              value={form.term}
              onChange={(e) => updateField('term', e.target.value)}
              placeholder="Enter term in months"
              className={`w-full border rounded-lg px-4 py-2.5 text-[#202124] bg-white transition-all ${
                errors.term 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-200' 
                  : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#e8f0fe]'
              } outline-none`}
            />
          </Field>
        </div>
      </div>

      {/* Financial Information Section */}
      <div className="space-y-4 pt-4 border-t border-[#e8eaed]">
        <h3 className="text-base font-semibold text-[#202124] border-b border-[#e8eaed] pb-2">
          Financial Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Basic Salary" error={errors.basicSalary}>
            <input
              type="number"
              value={form.basicSalary}
              onChange={(e) => updateField('basicSalary', e.target.value)}
              placeholder="0.00"
              className={`w-full border rounded-lg px-4 py-2.5 text-[#202124] bg-white transition-all ${
                errors.basicSalary 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-200' 
                  : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#e8f0fe]'
              } outline-none`}
            />
          </Field>
          <Field label="Allowance" error={errors.allowance}>
            <input
              type="number"
              value={form.allowance}
              onChange={(e) => updateField('allowance', e.target.value)}
              placeholder="0.00"
              className={`w-full border rounded-lg px-4 py-2.5 text-[#202124] bg-white transition-all ${
                errors.allowance 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-200' 
                  : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#e8f0fe]'
              } outline-none`}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Signing Bonus" error={errors.signingBonus}>
            <input
              type="number"
              value={form.signingBonus}
              onChange={(e) => updateField('signingBonus', e.target.value)}
              placeholder="0.00"
              className={`w-full border rounded-lg px-4 py-2.5 text-[#202124] bg-white transition-all ${
                errors.signingBonus 
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-200' 
                  : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#e8f0fe]'
              } outline-none`}
            />
          </Field>
        </div>
      </div>

      {/* Bonus Information Section */}
      <div className="space-y-4 pt-4 border-t border-[#e8eaed]">
        <h3 className="text-base font-semibold text-[#202124] border-b border-[#e8eaed] pb-2">
          Bonus Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Attendance Bonus (%)" error={errors.attendanceBonusPercent}>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                value={form.attendanceBonusPercent}
                onChange={(e) => updateField('attendanceBonusPercent', e.target.value)}
                placeholder="0"
                className={`flex-1 border rounded-lg px-4 py-2.5 text-[#202124] bg-white transition-all ${
                  errors.attendanceBonusPercent 
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-200' 
                    : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#e8f0fe]'
                } outline-none`}
              />
              <div className="text-sm font-medium text-[#5f6368] min-w-[100px] px-3 py-2 bg-[#f8f9fa] rounded-lg border border-[#dadce0]">
                = ₱{attendanceBonusAmount.toFixed(2)}
              </div>
            </div>
          </Field>
          <Field label="Perfect Attendance (%)" error={errors.perfectAttendancePercent}>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="100"
                value={form.perfectAttendancePercent}
                onChange={(e) => updateField('perfectAttendancePercent', e.target.value)}
                placeholder="0"
                className={`flex-1 border rounded-lg px-4 py-2.5 text-[#202124] bg-white transition-all ${
                  errors.perfectAttendancePercent 
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-200' 
                    : 'border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#e8f0fe]'
                } outline-none`}
              />
              <div className="text-sm font-medium text-[#5f6368] min-w-[100px] px-3 py-2 bg-[#f8f9fa] rounded-lg border border-[#dadce0]">
                = ₱{perfectAttendanceAmount.toFixed(2)}
              </div>
            </div>
          </Field>
        </div>
      </div>
      
      {/* Total Salary Summary */}
      <div className="pt-4 border-t border-[#e8eaed]">
        <div className="rounded-xl border border-[#1a73e8] px-6 py-4">
          <p className="text-xs uppercase tracking-wider text-[#1a73e8] font-semibold mb-2">Total Salary</p>
          <p className="text-3xl font-bold text-[#1a73e8]">₱{totalSalary.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
