import { useMemo, useState } from 'react';
import {
  calculateAttendanceBonus,
  calculatePerfectAttendance,
  calculateTotal,
} from '../utils/salary';

const initialForm = {
  employeeName: '',
  position: '',
  employmentDate: '',
  assessmentDate: '',
  contractType: '',
  term: '',
  expirationDate: '',
  resignationNote: '',
  currentOffer: 'No',
  signingBonus: '',
  basicSalary: '',
  allowance: '',
  attendanceBonusPercent: '',
  perfectAttendancePercent: '',
};

export function useContractCalculator() {
  const [form, setForm] = useState(initialForm);

  const attendanceBonusAmount = useMemo(
    () => calculateAttendanceBonus(form.basicSalary, form.attendanceBonusPercent),
    [form.basicSalary, form.attendanceBonusPercent]
  );

  const perfectAttendanceAmount = useMemo(
    () => calculatePerfectAttendance(form.basicSalary, form.perfectAttendancePercent),
    [form.basicSalary, form.perfectAttendancePercent]
  );

  const totalSalary = useMemo(
    () =>
      calculateTotal({
        basicSalary: form.basicSalary,
        allowance: form.allowance,
        signingBonus: form.signingBonus,
        attendanceBonusAmount,
        perfectAttendanceAmount,
      }),
    [form, attendanceBonusAmount, perfectAttendanceAmount]
  );

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const reset = () => setForm(initialForm);

  return {
    form,
    updateField,
    attendanceBonusAmount,
    perfectAttendanceAmount,
    totalSalary,
    reset,
  };
}
