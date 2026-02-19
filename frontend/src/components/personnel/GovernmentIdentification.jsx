import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionTitle from './SectionTitle';

const GovernmentIdentification = ({ formData, handleChange, errors, mode }) => {
    return (
        <fieldset disabled={mode === 'view'} className="contents group-disabled:opacity-100 disabled:opacity-100">
            <SectionTitle title="Section 3: Government Identification" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="sssNumber" className="font-semibold text-slate-700 dark:text-slate-300">SSS Number</Label>
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
                    <Label htmlFor="pagIbigNumber" className="font-semibold text-slate-700 dark:text-slate-300">PAG-IBIG Number</Label>
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
                    <Label htmlFor="philHealthNumber" className="font-semibold text-slate-700 dark:text-slate-300">PhilHealth Number</Label>
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
                    <Label htmlFor="tin" className="font-semibold text-slate-700 dark:text-slate-300">TIN</Label>
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
                    <Label htmlFor="employeeNumber" className="font-semibold text-slate-700 dark:text-slate-300">Employee Number</Label>
                    <Input
                        id="employeeNumber"
                        name="employeeNumber"
                        value={formData.employeeNumber}
                        onChange={handleChange}
                        placeholder="Enter employee ID"
                    />
                </div>
            </div>
        </fieldset>
    );
};

export default GovernmentIdentification;
