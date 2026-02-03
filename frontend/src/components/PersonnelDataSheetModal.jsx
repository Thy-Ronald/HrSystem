import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { X, Save, Loader2 } from "lucide-react"

const PersonnelDataSheetModal = ({ open, onClose, onSave, initialData, mode = 'add' }) => {
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

    const [formData, setFormData] = useState(defaultFormData);
    const [errors, setErrors] = useState({});

    React.useEffect(() => {
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

    const SectionTitle = ({ title }) => (
        <div className="mt-8 mb-4">
            <h3 className="text-sm font-bold text-[#1a3e62] uppercase tracking-wider bg-slate-50 p-2 rounded-md border-l-4 border-[#1a3e62]">
                {title}
            </h3>
        </div>
    );

    const getTitle = () => {
        switch (mode) {
            case 'edit': return 'Edit Personnel Data Sheet';
            case 'view': return 'View Personnel Data Sheet';
            default: return 'New Personnel Data Sheet';
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl [&>button]:text-white">
                <DialogHeader className="bg-[#1a3e62] text-white p-6 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-bold tracking-tight uppercase">
                        {getTitle()}
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[65vh]">
                    <div className="p-6">
                        <form id="pds-form" onSubmit={handleSubmit} className="space-y-4">
                            <fieldset disabled={mode === 'view'} className="contents group-disabled:opacity-100 disabled:opacity-100">
                                <SectionTitle title="Section 1: Personal Information" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dateStarted" className="font-semibold text-slate-700">Date Started <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="dateStarted"
                                            type="date"
                                            name="dateStarted"
                                            value={formData.dateStarted}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="surname" className="font-semibold text-slate-700">Surname <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="surname"
                                            name="surname"
                                            value={formData.surname}
                                            onChange={handleChange}
                                            placeholder="Enter surname"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName" className="font-semibold text-slate-700">First Name <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            onChange={handleChange}
                                            placeholder="Enter first name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="middleName" className="font-semibold text-slate-700">Middle Name</Label>
                                        <Input
                                            id="middleName"
                                            name="middleName"
                                            value={formData.middleName}
                                            onChange={handleChange}
                                            placeholder="Enter middle name"
                                        />
                                    </div>
                                </div>

                                {/* SECTION 2: BASIC DETAILS */}
                                <SectionTitle title="Section 2: Basic Details" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="dateOfBirth" className="font-semibold text-slate-700">Date of Birth</Label>
                                        <Input
                                            id="dateOfBirth"
                                            type="date"
                                            name="dateOfBirth"
                                            value={formData.dateOfBirth}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="placeOfBirth" className="font-semibold text-slate-700">Place of Birth</Label>
                                        <Input
                                            id="placeOfBirth"
                                            name="placeOfBirth"
                                            value={formData.placeOfBirth}
                                            onChange={handleChange}
                                            placeholder="Enter place of birth"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="font-semibold text-slate-700">Sex</Label>
                                        <RadioGroup
                                            name="sex"
                                            value={formData.sex}
                                            onValueChange={(val) => handleSelectChange('sex', val)}
                                            className="flex gap-4 pt-1"
                                        >
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Male" id="sex-male" />
                                                <Label htmlFor="sex-male" className="font-normal">Male</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Female" id="sex-female" />
                                                <Label htmlFor="sex-female" className="font-normal">Female</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="Other" id="sex-other" />
                                                <Label htmlFor="sex-other" className="font-normal">Other</Label>
                                            </div>
                                        </RadioGroup>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="civilStatus" className="font-semibold text-slate-700">Civil Status</Label>
                                        <Select
                                            name="civilStatus"
                                            value={formData.civilStatus}
                                            onValueChange={(val) => handleSelectChange('civilStatus', val)}
                                        >
                                            <SelectTrigger id="civilStatus">
                                                <SelectValue placeholder="Select civil status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Single">Single</SelectItem>
                                                <SelectItem value="Married">Married</SelectItem>
                                                <SelectItem value="Widowed">Widowed</SelectItem>
                                                <SelectItem value="Separated">Separated</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="citizenship" className="font-semibold text-slate-700">Citizenship</Label>
                                        <Input
                                            id="citizenship"
                                            name="citizenship"
                                            value={formData.citizenship}
                                            onChange={handleChange}
                                            placeholder="Enter citizenship"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bloodType" className="font-semibold text-slate-700">Blood Type</Label>
                                        <Select
                                            name="bloodType"
                                            value={formData.bloodType}
                                            onValueChange={(val) => handleSelectChange('bloodType', val)}
                                        >
                                            <SelectTrigger id="bloodType">
                                                <SelectValue placeholder="Select blood type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => (
                                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="height" className="font-semibold text-slate-700">Height (cm)</Label>
                                        <Input
                                            id="height"
                                            name="height"
                                            type="number"
                                            value={formData.height}
                                            onChange={handleChange}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="weight" className="font-semibold text-slate-700">Weight (kg)</Label>
                                        <Input
                                            id="weight"
                                            name="weight"
                                            type="number"
                                            value={formData.weight}
                                            onChange={handleChange}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>

                                {/* SECTION 3: GOVERNMENT IDENTIFICATION */}
                                <SectionTitle title="Section 3: Government Identification" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sssNumber" className="font-semibold text-slate-700">SSS Number</Label>
                                        <Input
                                            id="sssNumber"
                                            name="sssNumber"
                                            value={formData.sssNumber}
                                            onChange={handleChange}
                                            placeholder="00-0000000-0"
                                            className={errors.sssNumber ? "border-destructive focus-visible:ring-destructive" : ""}
                                        />
                                        {errors.sssNumber && <span className="text-[10px] text-destructive font-medium">{errors.sssNumber}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pagIbigNumber" className="font-semibold text-slate-700">PAG-IBIG Number</Label>
                                        <Input
                                            id="pagIbigNumber"
                                            name="pagIbigNumber"
                                            value={formData.pagIbigNumber}
                                            onChange={handleChange}
                                            placeholder="0000-0000-0000"
                                            className={errors.pagIbigNumber ? "border-destructive focus-visible:ring-destructive" : ""}
                                        />
                                        {errors.pagIbigNumber && <span className="text-[10px] text-destructive font-medium">{errors.pagIbigNumber}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="philHealthNumber" className="font-semibold text-slate-700">PhilHealth Number</Label>
                                        <Input
                                            id="philHealthNumber"
                                            name="philHealthNumber"
                                            value={formData.philHealthNumber}
                                            onChange={handleChange}
                                            placeholder="00-000000000-0"
                                            className={errors.philHealthNumber ? "border-destructive focus-visible:ring-destructive" : ""}
                                        />
                                        {errors.philHealthNumber && <span className="text-[10px] text-destructive font-medium">{errors.philHealthNumber}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tin" className="font-semibold text-slate-700">TIN</Label>
                                        <Input
                                            id="tin"
                                            name="tin"
                                            value={formData.tin}
                                            onChange={handleChange}
                                            placeholder="000-000-000-000"
                                            className={errors.tin ? "border-destructive focus-visible:ring-destructive" : ""}
                                        />
                                        {errors.tin && <span className="text-[10px] text-destructive font-medium">{errors.tin}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="employeeNumber" className="font-semibold text-slate-700">Employee Number</Label>
                                        <Input
                                            id="employeeNumber"
                                            name="employeeNumber"
                                            value={formData.employeeNumber}
                                            onChange={handleChange}
                                            placeholder="Enter employee ID"
                                        />
                                    </div>
                                </div>

                                {/* SECTION 4: CONTACT INFORMATION */}
                                <SectionTitle title="Section 4: Contact Information" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="residentialAddress" className="font-semibold text-slate-700">Residential Address</Label>
                                        <Input
                                            id="residentialAddress"
                                            name="residentialAddress"
                                            value={formData.residentialAddress}
                                            onChange={handleChange}
                                            placeholder="Enter residential address"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="permanentAddress" className="font-semibold text-slate-700">Permanent Address</Label>
                                        <Input
                                            id="permanentAddress"
                                            name="permanentAddress"
                                            value={formData.permanentAddress}
                                            onChange={handleChange}
                                            placeholder="Enter permanent address"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="zipCode" className="font-semibold text-slate-700">ZIP Code</Label>
                                        <Input
                                            id="zipCode"
                                            name="zipCode"
                                            value={formData.zipCode}
                                            onChange={handleChange}
                                            placeholder="0000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emailAddress" className="font-semibold text-slate-700">Email Address <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="emailAddress"
                                            name="emailAddress"
                                            type="email"
                                            value={formData.emailAddress}
                                            onChange={handleChange}
                                            placeholder="name@example.com"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="telephoneNumber" className="font-semibold text-slate-700">Telephone Number</Label>
                                        <Input
                                            id="telephoneNumber"
                                            name="telephoneNumber"
                                            value={formData.telephoneNumber}
                                            onChange={handleChange}
                                            placeholder="Enter telephone number"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cellphoneNumber" className="font-semibold text-slate-700">Cellphone Number <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="cellphoneNumber"
                                            name="cellphoneNumber"
                                            value={formData.cellphoneNumber}
                                            onChange={handleChange}
                                            placeholder="09XX XXX XXXX"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* SECTION 5: IN CASE OF EMERGENCY */}
                                <SectionTitle title="Section 5: In Case of Emergency" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="emergencyName" className="font-semibold text-slate-700">Name <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="emergencyName"
                                            name="emergencyName"
                                            value={formData.emergencyName}
                                            onChange={handleChange}
                                            placeholder="Emergency contact name"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emergencyRelationship" className="font-semibold text-slate-700">Relationship</Label>
                                        <Input
                                            id="emergencyRelationship"
                                            name="emergencyRelationship"
                                            value={formData.emergencyRelationship}
                                            onChange={handleChange}
                                            placeholder="Relationship to employee"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emergencyAddress" className="font-semibold text-slate-700">Emergency Address</Label>
                                        <Input
                                            id="emergencyAddress"
                                            name="emergencyAddress"
                                            value={formData.emergencyAddress}
                                            onChange={handleChange}
                                            placeholder="Emergency contact address"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emergencyOccupation" className="font-semibold text-slate-700">Occupation</Label>
                                        <Input
                                            id="emergencyOccupation"
                                            name="emergencyOccupation"
                                            value={formData.emergencyOccupation}
                                            onChange={handleChange}
                                            placeholder="Emergency contact occupation"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="emergencyContactNumber" className="font-semibold text-slate-700">Contact Number <span className="text-destructive">*</span></Label>
                                        <Input
                                            id="emergencyContactNumber"
                                            name="emergencyContactNumber"
                                            value={formData.emergencyContactNumber}
                                            onChange={handleChange}
                                            placeholder="Emergency contact number"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* SECTION 6: PARENT INFORMATION */}
                                <SectionTitle title="Section 6: Parent Information" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fatherName" className="font-semibold text-slate-700">Name of Father</Label>
                                        <Input
                                            id="fatherName"
                                            name="fatherName"
                                            value={formData.fatherName}
                                            onChange={handleChange}
                                            placeholder="Father's full name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="motherMaidenName" className="font-semibold text-slate-700">Maiden Name of Mother</Label>
                                        <Input
                                            id="motherMaidenName"
                                            name="motherMaidenName"
                                            value={formData.motherMaidenName}
                                            onChange={handleChange}
                                            placeholder="Mother's maiden name"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label htmlFor="parentsAddress" className="font-semibold text-slate-700">Parents' Address</Label>
                                        <Input
                                            id="parentsAddress"
                                            name="parentsAddress"
                                            value={formData.parentsAddress}
                                            onChange={handleChange}
                                            placeholder="Address of parents"
                                        />
                                    </div>
                                </div>

                                {/* SECTION 7: EDUCATIONAL BACKGROUND */}
                                <SectionTitle title="Section 7: Educational Background" />
                                <div className="border rounded-lg overflow-hidden border-slate-200">
                                    <Table>
                                        <TableHeader className="bg-slate-50">
                                            <TableRow>
                                                <TableHead className="w-[20%] font-bold text-[#1a3e62]">Level</TableHead>
                                                <TableHead className="font-bold text-[#1a3e62]">School</TableHead>
                                                <TableHead className="font-bold text-[#1a3e62]">Degree / Course</TableHead>
                                                <TableHead className="w-[25%] font-bold text-[#1a3e62]">Inclusive Dates</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {[
                                                { id: 'elementary', label: 'Elementary' },
                                                { id: 'secondary', label: 'Secondary' },
                                                { id: 'vocational', label: 'Vocational / Trade' },
                                                { id: 'tertiary', label: 'Tertiary' }
                                            ].map((level) => (
                                                <TableRow key={level.id}>
                                                    <TableCell className="font-semibold text-slate-600">{level.label}</TableCell>
                                                    <TableCell>
                                                        <Input
                                                            variant="ghost"
                                                            value={formData.education[level.id].school}
                                                            onChange={(e) => handleEducationChange(level.id, 'school', e.target.value)}
                                                            className="border-none bg-transparent focus-visible:ring-0 focus-visible:bg-slate-50 h-8 px-2"
                                                            placeholder="Enter school name"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            variant="ghost"
                                                            value={formData.education[level.id].degree}
                                                            onChange={(e) => handleEducationChange(level.id, 'degree', e.target.value)}
                                                            className="border-none bg-transparent focus-visible:ring-0 focus-visible:bg-slate-50 h-8 px-2"
                                                            placeholder="Degree earned"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            variant="ghost"
                                                            value={formData.education[level.id].dates}
                                                            onChange={(e) => handleEducationChange(level.id, 'dates', e.target.value)}
                                                            className="border-none bg-transparent focus-visible:ring-0 focus-visible:bg-slate-50 h-8 px-2"
                                                            placeholder="YYYY - YYYY"
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </fieldset>
                        </form>
                    </div>
                </ScrollArea>

                <DialogFooter className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="px-6 border-slate-200 text-slate-600 hover:bg-slate-100 font-medium"
                    >
                        {mode === 'view' ? 'Close' : 'Cancel'}
                    </Button>
                    {mode !== 'view' && (
                        <Button
                            type="submit"
                            form="pds-form"
                            className="bg-[#1a3e62] hover:bg-[#122c46] text-white px-8 font-semibold shadow-md"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {mode === 'edit' ? 'Update Record' : 'Save Personnel Data'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PersonnelDataSheetModal;
