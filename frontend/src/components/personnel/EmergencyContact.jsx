import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionTitle from './SectionTitle';

const EmergencyContact = ({ formData, handleChange, mode }) => {
    return (
        <fieldset disabled={mode === 'view'} className="contents group-disabled:opacity-100 disabled:opacity-100">
            <SectionTitle title="Section 5: In Case of Emergency" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="emergencyName" className="font-semibold text-slate-700 dark:text-slate-300">Name <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="emergencyRelationship" className="font-semibold text-slate-700 dark:text-slate-300">Relationship</Label>
                    <Input
                        id="emergencyRelationship"
                        name="emergencyRelationship"
                        value={formData.emergencyRelationship}
                        onChange={handleChange}
                        placeholder="Relationship to employee"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="emergencyAddress" className="font-semibold text-slate-700 dark:text-slate-300">Emergency Address</Label>
                    <Input
                        id="emergencyAddress"
                        name="emergencyAddress"
                        value={formData.emergencyAddress}
                        onChange={handleChange}
                        placeholder="Emergency contact address"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="emergencyOccupation" className="font-semibold text-slate-700 dark:text-slate-300">Occupation</Label>
                    <Input
                        id="emergencyOccupation"
                        name="emergencyOccupation"
                        value={formData.emergencyOccupation}
                        onChange={handleChange}
                        placeholder="Emergency contact occupation"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="emergencyContactNumber" className="font-semibold text-slate-700 dark:text-slate-300">Contact Number <span className="text-destructive">*</span></Label>
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
        </fieldset>
    );
};

export default EmergencyContact;
