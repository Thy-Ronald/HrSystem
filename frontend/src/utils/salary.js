function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function calculateAttendanceBonus(basicSalary, percent) {
  return toNumber(basicSalary) * (toNumber(percent) / 100);
}

export function calculatePerfectAttendance(basicSalary, percent) {
  return toNumber(basicSalary) * (toNumber(percent) / 100);
}

export function calculateTotal({
  basicSalary,
  allowance,
  signingBonus,
  attendanceBonusAmount,
  perfectAttendanceAmount,
}) {
  return (
    toNumber(basicSalary) +
    toNumber(allowance) +
    toNumber(signingBonus) +
    toNumber(attendanceBonusAmount) +
    toNumber(perfectAttendanceAmount)
  );
}
