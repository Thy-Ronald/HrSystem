import React from 'react';
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import SectionTitle from './SectionTitle';

const EducationalBackground = ({ formData, handleEducationChange, mode }) => {
    return (
        <fieldset disabled={mode === 'view'} className="contents group-disabled:opacity-100 disabled:opacity-100">
            <SectionTitle title="Section 7: Educational Background" />
            <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-800">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-900">
                        <TableRow>
                            <TableHead className="w-[20%] font-bold text-[#1a3e62] dark:text-blue-400">Level</TableHead>
                            <TableHead className="font-bold text-[#1a3e62] dark:text-blue-400">School</TableHead>
                            <TableHead className="font-bold text-[#1a3e62] dark:text-blue-400">Degree / Course</TableHead>
                            <TableHead className="w-[25%] font-bold text-[#1a3e62] dark:text-blue-400">Inclusive Dates</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[
                            { id: 'elementary', label: 'Elementary' },
                            { id: 'secondary', label: 'Secondary' },
                            { id: 'vocational', label: 'Vocational / Trade' },
                            { id: 'tertiary', label: 'Tertiary' }
                        ].map((level) => (
                            <TableRow key={level.id} className="border-b border-slate-100 dark:border-slate-800">
                                <TableCell className="font-semibold text-slate-600 dark:text-slate-300">{level.label}</TableCell>
                                <TableCell>
                                    <Input
                                        variant="ghost"
                                        value={formData.education[level.id].school}
                                        onChange={(e) => handleEducationChange(level.id, 'school', e.target.value)}
                                        className="border-none bg-transparent focus-visible:ring-0 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800 h-8 px-2"
                                        placeholder="Enter school name"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        variant="ghost"
                                        value={formData.education[level.id].degree}
                                        onChange={(e) => handleEducationChange(level.id, 'degree', e.target.value)}
                                        className="border-none bg-transparent focus-visible:ring-0 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800 h-8 px-2"
                                        placeholder="Degree earned"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        variant="ghost"
                                        value={formData.education[level.id].dates}
                                        onChange={(e) => handleEducationChange(level.id, 'dates', e.target.value)}
                                        className="border-none bg-transparent focus-visible:ring-0 focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800 h-8 px-2"
                                        placeholder="YYYY - YYYY"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </fieldset>
    );
};

export default EducationalBackground;
