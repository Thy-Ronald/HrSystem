import { useState, useEffect } from 'react';

const defaultFormData = {
    // Section 1: Personal Information
    dateStarted: '',
    surname: '',
    firstName: '',
    middleName: '',

    // Section 2: Basic Details
    dateOfBirth: '',
    placeOfBirth: '',
    sex: '',
    civilStatus: '',
    citizenship: '',
    height: '',
    weight: '',
    bloodType: '',

    // Section 3: Government Identification
    sssNumber: '',
    pagIbigNumber: '',
    philHealthNumber: '',
    tin: '',
    employeeNumber: '',

    // Section 4: Contact Information
    residentialAddress: '',
    permanentAddress: '',
    zipCode: '',
    telephoneNumber: '',
    cellphoneNumber: '',
    emailAddress: '',

    // Section 5: Emergency Contact
    emergencyName: '',
    emergencyRelationship: '',
    emergencyAddress: '',
    emergencyOccupation: '',
    emergencyContactNumber: '',

    // Section 6: Parent Information
    fatherName: '',
    motherMaidenName: '',
    parentsAddress: '',

    // Section 7: Educational Background
    education: {
        elementary: { school: '', degree: '', dates: '' },
        secondary: { school: '', degree: '', dates: '' },
        vocational: { school: '', degree: '', dates: '' },
        tertiary: { school: '', degree: '', dates: '' }
    }
};

export const usePersonnelForm = (initialData, mode, open, onSave) => {
    const [formData, setFormData] = useState(defaultFormData);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open) {
            setErrors({}); // Clear errors when modal opens
            if (initialData && (mode === 'edit' || mode === 'view')) {
                // Ensure education object exists and has all levels
                const mergedEducation = {
                    ...defaultFormData.education,
                    ...(initialData.education || {})
                };

                // Helper to format date for input (YYYY-MM-DD)
                const formatDateForInput = (dateString) => {
                    if (!dateString) return '';
                    // Handle both ISO strings (2023-10-25T...) and plain date strings (2023-10-25)
                    return dateString.includes('T') ? dateString.split('T')[0] : dateString;
                };

                // Merge initial data with default structure to prevent missing fields
                setFormData({
                    ...defaultFormData,
                    ...initialData,
                    dateStarted: formatDateForInput(initialData.dateStarted),
                    dateOfBirth: formatDateForInput(initialData.dateOfBirth),
                    education: mergedEducation
                });
            } else {
                setFormData(defaultFormData);
            }
        }
    }, [open, initialData, mode]);

    const handleChange = (e) => {
        if (mode === 'view') return;
        let { name, value } = e.target || e;

        // Auto-format ID fields
        if (['sssNumber', 'pagIbigNumber', 'philHealthNumber', 'tin'].includes(name)) {
            // Remove all non-digits
            const digits = value.replace(/\D/g, '');

            if (name === 'sssNumber') {
                // SSS: XX-XXXXXXX-X (10 digits)
                const limit = 10;
                const clean = digits.slice(0, limit);
                value = clean;
                if (clean.length > 2) value = `${clean.slice(0, 2)}-${clean.slice(2)}`;
                if (clean.length > 9) value = `${value.slice(0, 12)}-${clean.slice(9)}`;
            } else if (name === 'pagIbigNumber') {
                // Pag-IBIG: XXXX-XXXX-XXXX (12 digits)
                const limit = 12;
                const clean = digits.slice(0, limit);
                value = clean;
                if (clean.length > 4) value = `${clean.slice(0, 4)}-${clean.slice(4)}`;
                if (clean.length > 8) value = `${value.slice(0, 9)}-${clean.slice(8)}`;
            } else if (name === 'philHealthNumber') {
                // PhilHealth: XX-XXXXXXXXX-X (12 digits)
                const limit = 12;
                const clean = digits.slice(0, limit);
                value = clean;
                if (clean.length > 2) value = `${clean.slice(0, 2)}-${clean.slice(2)}`;
                if (clean.length > 11) value = `${value.slice(0, 14)}-${clean.slice(11)}`;
            } else if (name === 'tin') {
                // TIN: XXX-XXX-XXX-XXX (12 digits)
                const limit = 12;
                const clean = digits.slice(0, limit);
                value = clean;
                if (clean.length > 3) value = `${clean.slice(0, 3)}-${clean.slice(3)}`;
                if (clean.length > 6) value = `${value.slice(0, 7)}-${clean.slice(6)}`;
                if (clean.length > 9) value = `${value.slice(0, 11)}-${clean.slice(9)}`;
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleSelectChange = (name, value) => {
        if (mode === 'view') return;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleEducationChange = (level, field, value) => {
        if (mode === 'view') return;
        setFormData(prev => ({
            ...prev,
            education: {
                ...prev.education,
                [level]: {
                    ...prev.education[level],
                    [field]: value
                }
            }
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        // SSS Validation (XX-XXXXXXX-X)
        if (formData.sssNumber && !/^\d{2}-\d{7}-\d{1}$/.test(formData.sssNumber)) {
            newErrors.sssNumber = 'Format: XX-XXXXXXX-X';
        }

        // Pag-IBIG Validation (XXXX-XXXX-XXXX)
        if (formData.pagIbigNumber && !/^\d{4}-\d{4}-\d{4}$/.test(formData.pagIbigNumber)) {
            newErrors.pagIbigNumber = 'Format: XXXX-XXXX-XXXX';
        }

        // PhilHealth Validation (XX-XXXXXXXXX-X)
        if (formData.philHealthNumber && !/^\d{2}-\d{9}-\d{1}$/.test(formData.philHealthNumber)) {
            newErrors.philHealthNumber = 'Format: XX-XXXXXXXXX-X';
        }

        // TIN Validation (XXX-XXX-XXX-XXX)
        if (formData.tin && !/^\d{3}-\d{3}-\d{3}-\d{3}$/.test(formData.tin)) {
            newErrors.tin = 'Format: XXX-XXX-XXX-XXX';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (validateForm()) {
            onSave(formData);
        }
    };

    return {
        formData,
        errors,
        handleChange,
        handleSelectChange,
        handleEducationChange,
        handleSubmit
    };
};
