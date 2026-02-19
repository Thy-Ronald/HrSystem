import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save } from "lucide-react"

import { usePersonnelForm } from '../hooks/usePersonnelForm';
import PersonalInformation from './personnel/PersonalInformation';
import BasicDetails from './personnel/BasicDetails';
import GovernmentIdentification from './personnel/GovernmentIdentification';
import ContactInformation from './personnel/ContactInformation';
import EmergencyContact from './personnel/EmergencyContact';
import ParentInformation from './personnel/ParentInformation';
import EducationalBackground from './personnel/EducationalBackground';

const PersonnelDataSheetModal = ({ open, onClose, onSave, initialData, mode = 'add' }) => {
    const {
        formData,
        errors,
        handleChange,
        handleSelectChange,
        handleEducationChange,
        handleSubmit
    } = usePersonnelForm(initialData, mode, open, onSave);

    const getTitle = () => {
        switch (mode) {
            case 'edit': return 'Edit Personnel Data Sheet';
            case 'view': return 'View Personnel Data Sheet';
            default: return 'New Personnel Data Sheet';
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl [&>button]:text-white bg-white dark:bg-slate-950">
                <DialogHeader className="bg-[#1a3e62] text-white p-6 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-xl font-bold tracking-tight uppercase">
                        {getTitle()}
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[65vh]">
                    <div className="p-6">
                        <form id="pds-form" onSubmit={handleSubmit} className="space-y-4">
                            <PersonalInformation
                                formData={formData}
                                handleChange={handleChange}
                                mode={mode}
                            />

                            <BasicDetails
                                formData={formData}
                                handleChange={handleChange}
                                handleSelectChange={handleSelectChange}
                                mode={mode}
                            />

                            <GovernmentIdentification
                                formData={formData}
                                handleChange={handleChange}
                                errors={errors}
                                mode={mode}
                            />

                            <ContactInformation
                                formData={formData}
                                handleChange={handleChange}
                                mode={mode}
                            />

                            <EmergencyContact
                                formData={formData}
                                handleChange={handleChange}
                                mode={mode}
                            />

                            <ParentInformation
                                formData={formData}
                                handleChange={handleChange}
                                mode={mode}
                            />

                            <EducationalBackground
                                formData={formData}
                                handleEducationChange={handleEducationChange}
                                mode={mode}
                            />
                        </form>
                    </div>
                </ScrollArea>

                <DialogFooter className="bg-slate-50 dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="px-6 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
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
