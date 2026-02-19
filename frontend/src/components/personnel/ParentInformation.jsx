import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionTitle from './SectionTitle';

const ParentInformation = ({ formData, handleChange, mode }) => {
    return (
        <fieldset disabled={mode === 'view'} className="contents group-disabled:opacity-100 disabled:opacity-100">
            <SectionTitle title="Section 6: Parent Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="fatherName" className="font-semibold text-slate-700 dark:text-slate-300">Name of Father</Label>
                    <Input
                        id="fatherName"
                        name="fatherName"
                        value={formData.fatherName}
                        onChange={handleChange}
                        placeholder="Father's full name"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="motherMaidenName" className="font-semibold text-slate-700 dark:text-slate-300">Maiden Name of Mother</Label>
                    <Input
                        id="motherMaidenName"
                        name="motherMaidenName"
                        value={formData.motherMaidenName}
                        onChange={handleChange}
                        placeholder="Mother's maiden name"
                    />
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="parentsAddress" className="font-semibold text-slate-700 dark:text-slate-300">Parents' Address</Label>
                    <Input
                        id="parentsAddress"
                        name="parentsAddress"
                        value={formData.parentsAddress}
                        onChange={handleChange}
                        placeholder="Address of parents"
                    />
                </div>
            </div>
        </fieldset>
    );
};

export default ParentInformation;
