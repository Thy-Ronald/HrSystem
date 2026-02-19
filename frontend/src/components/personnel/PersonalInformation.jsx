import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionTitle from './SectionTitle';

const PersonalInformation = ({ formData, handleChange, mode }) => {
    return (
        <fieldset disabled={mode === 'view'} className="contents group-disabled:opacity-100 disabled:opacity-100">
            <SectionTitle title="Section 1: Personal Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="dateStarted" className="font-semibold text-slate-700 dark:text-slate-300">Date Started <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="surname" className="font-semibold text-slate-700 dark:text-slate-300">Surname <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="firstName" className="font-semibold text-slate-700 dark:text-slate-300">First Name <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="middleName" className="font-semibold text-slate-700 dark:text-slate-300">Middle Name</Label>
                    <Input
                        id="middleName"
                        name="middleName"
                        value={formData.middleName}
                        onChange={handleChange}
                        placeholder="Enter middle name"
                    />
                </div>
            </div>
        </fieldset>
    );
};

export default PersonalInformation;
