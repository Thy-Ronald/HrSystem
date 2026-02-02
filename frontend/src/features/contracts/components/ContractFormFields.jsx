import React from 'react';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Section title component matching shadcn style
 */
const SectionTitle = ({ title }) => (
  <div className="mt-8 mb-4">
    <h3 className="text-sm font-bold text-[#1a3e62] uppercase tracking-wider bg-slate-50 p-2 rounded-md">
      {title}
    </h3>
  </div>
);

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
      <SectionTitle title="Basic Information" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="employeeName" className="font-semibold text-slate-700">
            Employee Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="employeeName"
            value={form.employeeName}
            onChange={(e) => updateField('employeeName', e.target.value)}
            className={errors.employeeName ? "border-destructive focus-visible:ring-destructive" : ""}
            placeholder="Enter employee name"
            required
          />
          {errors.employeeName && <p className="text-xs text-destructive font-medium">{errors.employeeName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="position" className="font-semibold text-slate-700">
            Position <span className="text-destructive">*</span>
          </Label>
          <Input
            id="position"
            value={form.position}
            onChange={(e) => updateField('position', e.target.value)}
            className={errors.position ? "border-destructive focus-visible:ring-destructive" : ""}
            placeholder="Enter position"
            required
          />
          {errors.position && <p className="text-xs text-destructive font-medium">{errors.position}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assessmentDate" className="font-semibold text-slate-700">
            Assessment Date <span className="text-destructive">*</span>
          </Label>
          <Input
            id="assessmentDate"
            type="date"
            value={form.assessmentDate}
            onChange={(e) => updateField('assessmentDate', e.target.value)}
            className={errors.assessmentDate ? "border-destructive focus-visible:ring-destructive" : ""}
            required
          />
          {errors.assessmentDate && <p className="text-xs text-destructive font-medium">{errors.assessmentDate}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="term" className="font-semibold text-slate-700">
            Term (Months) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="term"
            type="number"
            min="1"
            value={form.term}
            onChange={(e) => updateField('term', e.target.value)}
            className={errors.term ? "border-destructive focus-visible:ring-destructive" : ""}
            placeholder="Enter term in months"
            required
          />
          {errors.term && <p className="text-xs text-destructive font-medium">{errors.term}</p>}
        </div>
      </div>

      {/* Financial Information Section */}
      <SectionTitle title="Financial Information" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="basicSalary" className="font-semibold text-slate-700">Basic Salary</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₱</span>
            <Input
              id="basicSalary"
              type="number"
              value={form.basicSalary}
              onChange={(e) => updateField('basicSalary', e.target.value)}
              className={`pl-8 ${errors.basicSalary ? "border-destructive focus-visible:ring-destructive" : ""}`}
              placeholder="0.00"
            />
          </div>
          {errors.basicSalary && <p className="text-xs text-destructive font-medium">{errors.basicSalary}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="allowance" className="font-semibold text-slate-700">Allowance</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₱</span>
            <Input
              id="allowance"
              type="number"
              value={form.allowance}
              onChange={(e) => updateField('allowance', e.target.value)}
              className={`pl-8 ${errors.allowance ? "border-destructive focus-visible:ring-destructive" : ""}`}
              placeholder="0.00"
            />
          </div>
          {errors.allowance && <p className="text-xs text-destructive font-medium">{errors.allowance}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="signingBonus" className="font-semibold text-slate-700">Signing Bonus</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">₱</span>
            <Input
              id="signingBonus"
              type="number"
              value={form.signingBonus}
              onChange={(e) => updateField('signingBonus', e.target.value)}
              className={`pl-8 ${errors.signingBonus ? "border-destructive focus-visible:ring-destructive" : ""}`}
              placeholder="0.00"
            />
          </div>
          {errors.signingBonus && <p className="text-xs text-destructive font-medium">{errors.signingBonus}</p>}
        </div>
      </div>

      {/* Bonus Information Section */}
      <SectionTitle title="Bonus Information" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="attendanceBonusPercent" className="font-semibold text-slate-700">Attendance Bonus (%)</Label>
          <div className="relative">
            <Input
              id="attendanceBonusPercent"
              type="number"
              min="0"
              max="100"
              value={form.attendanceBonusPercent}
              onChange={(e) => updateField('attendanceBonusPercent', e.target.value)}
              className={`pr-8 ${errors.attendanceBonusPercent ? "border-destructive focus-visible:ring-destructive" : ""}`}
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
          </div>
          {errors.attendanceBonusPercent && <p className="text-xs text-destructive font-medium">{errors.attendanceBonusPercent}</p>}
        </div>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Attendance Bonus Amount</p>
            <p className="text-xl font-bold text-[#1a3e62]">₱{attendanceBonusAmount.toFixed(2)}</p>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <Label htmlFor="perfectAttendancePercent" className="font-semibold text-slate-700">Perfect Attendance (%)</Label>
          <div className="relative">
            <Input
              id="perfectAttendancePercent"
              type="number"
              min="0"
              max="100"
              value={form.perfectAttendancePercent}
              onChange={(e) => updateField('perfectAttendancePercent', e.target.value)}
              className={`pr-8 ${errors.perfectAttendancePercent ? "border-destructive focus-visible:ring-destructive" : ""}`}
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
          </div>
          {errors.perfectAttendancePercent && <p className="text-xs text-destructive font-medium">{errors.perfectAttendancePercent}</p>}
        </div>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4 flex flex-col justify-center h-full">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Perfect Attendance Amount</p>
            <p className="text-xl font-bold text-[#1a3e62]">₱{perfectAttendanceAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Salary Summary */}
      <div className="mt-10 pt-6">
        <Separator className="mb-6" />
        <Card className="bg-[#1a3e62] text-white border-none shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-1">Monthly Total Salary</p>
              <h2 className="text-4xl font-extrabold tracking-tight">₱{totalSalary.toFixed(2)}</h2>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-slate-300 max-w-[200px]">
                Including basic, allowance, and potential bonuses
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
