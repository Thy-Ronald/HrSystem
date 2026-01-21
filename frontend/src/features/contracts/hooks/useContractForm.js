import { useState, useCallback } from 'react';
import { submitContract, updateContract, fetchContractById } from '../../../services/api';
import { useContractCalculator } from '../../../hooks/useContractCalculator';

/**
 * Custom hook for managing contract form state and submission
 */
export function useContractForm() {
  const {
    form,
    updateField,
    attendanceBonusAmount,
    perfectAttendanceAmount,
    totalSalary,
    reset,
  } = useContractCalculator();

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ state: 'idle', message: '' });
  const [saving, setSaving] = useState(false);
  const [editingContractId, setEditingContractId] = useState(null);

  const validate = useCallback(() => {
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
  }, [form]);

  const loadContractForEdit = useCallback(async (contractId) => {
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
      setStatus({ state: 'idle', message: '' });
      setErrors({});
      return true;
    } catch (err) {
      console.error('Error loading contract:', err);
      setStatus({ state: 'error', message: 'Unable to load contract for editing.' });
      return false;
    }
  }, [updateField]);

  const submit = useCallback(async () => {
    if (!validate()) {
      setStatus({ state: 'error', message: 'Please fix the highlighted fields.' });
      return false;
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
        await updateContract(editingContractId, contractData);
        setStatus({ state: 'success', message: 'Contract updated successfully!' });
      } else {
        await submitContract(contractData);
        setStatus({ state: 'success', message: 'Contract saved successfully!' });
      }
      
      setSaving(false);
      reset();
      setEditingContractId(null);
      setErrors({});
      
      return true;
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
      return false;
    }
  }, [form, validate, editingContractId, attendanceBonusAmount, perfectAttendanceAmount, reset]);

  const resetForm = useCallback(() => {
    reset();
    setEditingContractId(null);
    setErrors({});
    setStatus({ state: 'idle', message: '' });
  }, [reset]);

  return {
    form,
    updateField,
    attendanceBonusAmount,
    perfectAttendanceAmount,
    totalSalary,
    errors,
    status,
    saving,
    editingContractId,
    setEditingContractId,
    validate,
    loadContractForEdit,
    submit,
    reset: resetForm,
    setErrors,
    setStatus,
  };
}
