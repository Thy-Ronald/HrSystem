import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import SectionTitle from './SectionTitle';

const BasicDetails = ({ formData, handleChange, handleSelectChange, mode }) => {
    return (
        <fieldset disabled={mode === 'view'} className="contents group-disabled:opacity-100 disabled:opacity-100">
            <SectionTitle title="Section 2: Basic Details" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="dateOfBirth" className="font-semibold text-slate-700 dark:text-slate-300">Date of Birth</Label>
                    <Input
                        id="dateOfBirth"
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="placeOfBirth" className="font-semibold text-slate-700 dark:text-slate-300">Place of Birth</Label>
                    <Input
                        id="placeOfBirth"
                        name="placeOfBirth"
                        value={formData.placeOfBirth}
                        onChange={handleChange}
                        placeholder="Enter place of birth"
                    />
                </div>
                <div className="space-y-3">
                    <Label className="font-semibold text-slate-700 dark:text-slate-300">Sex</Label>
                    <RadioGroup
                        name="sex"
                        value={formData.sex}
                        onValueChange={(val) => handleSelectChange('sex', val)}
                        className="flex gap-4 pt-1"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Male" id="sex-male" />
                            <Label htmlFor="sex-male" className="font-normal dark:text-slate-300">Male</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Female" id="sex-female" />
                            <Label htmlFor="sex-female" className="font-normal dark:text-slate-300">Female</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Other" id="sex-other" />
                            <Label htmlFor="sex-other" className="font-normal dark:text-slate-300">Other</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="civilStatus" className="font-semibold text-slate-700 dark:text-slate-300">Civil Status</Label>
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
                    <Label htmlFor="citizenship" className="font-semibold text-slate-700 dark:text-slate-300">Citizenship</Label>
                    <Input
                        id="citizenship"
                        name="citizenship"
                        value={formData.citizenship}
                        onChange={handleChange}
                        placeholder="Enter citizenship"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bloodType" className="font-semibold text-slate-700 dark:text-slate-300">Blood Type</Label>
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
                    <Label htmlFor="height" className="font-semibold text-slate-700 dark:text-slate-300">Height (cm)</Label>
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
                    <Label htmlFor="weight" className="font-semibold text-slate-700 dark:text-slate-300">Weight (kg)</Label>
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
        </fieldset>
    );
};

export default BasicDetails;
