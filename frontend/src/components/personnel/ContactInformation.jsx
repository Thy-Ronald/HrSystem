import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SectionTitle from './SectionTitle';

const ContactInformation = ({ formData, handleChange, mode }) => {
    return (
        <fieldset disabled={mode === 'view'} className="contents group-disabled:opacity-100 disabled:opacity-100">
            <SectionTitle title="Section 4: Contact Information" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="residentialAddress" className="font-semibold text-slate-700 dark:text-slate-300">Residential Address</Label>
                    <Input
                        id="residentialAddress"
                        name="residentialAddress"
                        value={formData.residentialAddress}
                        onChange={handleChange}
                        placeholder="Enter residential address"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="permanentAddress" className="font-semibold text-slate-700 dark:text-slate-300">Permanent Address</Label>
                    <Input
                        id="permanentAddress"
                        name="permanentAddress"
                        value={formData.permanentAddress}
                        onChange={handleChange}
                        placeholder="Enter permanent address"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="zipCode" className="font-semibold text-slate-700 dark:text-slate-300">ZIP Code</Label>
                    <Input
                        id="zipCode"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleChange}
                        placeholder="0000"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="emailAddress" className="font-semibold text-slate-700 dark:text-slate-300">Email Address <span className="text-destructive">*</span></Label>
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
                    <Label htmlFor="telephoneNumber" className="font-semibold text-slate-700 dark:text-slate-300">Telephone Number</Label>
                    <Input
                        id="telephoneNumber"
                        name="telephoneNumber"
                        value={formData.telephoneNumber}
                        onChange={handleChange}
                        placeholder="Enter telephone number"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cellphoneNumber" className="font-semibold text-slate-700 dark:text-slate-300">Cellphone Number <span className="text-destructive">*</span></Label>
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
        </fieldset>
    );
};

export default ContactInformation;
