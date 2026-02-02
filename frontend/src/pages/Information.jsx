import React, { useState, useEffect } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Plus, RefreshCw, Loader2, AlertCircle, FileText, Eye, Pencil } from "lucide-react"
import PersonnelDataSheetModal from '../components/PersonnelDataSheetModal';
import { ContractPagination } from '../features/contracts/components/ContractPagination';
import { fetchPersonnelRecords, submitPersonnelRecord, updatePersonnelRecord } from '../services/api';
import { formatDate } from '../utils/format';

const ITEMS_PER_PAGE = 10;

const Information = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [modalMode, setModalMode] = useState('add'); // 'add', 'edit', 'view'

    const loadRecords = async () => {
        setLoading(true);
        try {
            const data = await fetchPersonnelRecords();
            setRecords(Array.isArray(data) ? data : []);
            setError(null);
            setCurrentPage(1); // Reset to first page on refresh
        } catch (err) {
            console.error('Error loading personnel records:', err);
            setError('Failed to load records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecords();
    }, []);

    const handleAddNew = () => {
        setSelectedRecord(null);
        setModalMode('add');
        setIsModalOpen(true);
    };

    const handleView = (record) => {
        setSelectedRecord(record);
        setModalMode('view');
        setIsModalOpen(true);
    };

    const handleEdit = (record) => {
        setSelectedRecord(record);
        setModalMode('edit');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedRecord(null);
        setModalMode('add');
    };

    const handleSavePersonnelData = async (data) => {
        try {
            if (modalMode === 'add') {
                await submitPersonnelRecord(data);
            } else if (modalMode === 'edit' && selectedRecord) {
                await updatePersonnelRecord(selectedRecord.id, data);
            }
            handleCloseModal();
            loadRecords(); // Refresh list
        } catch (err) {
            console.error('Error saving personnel data:', err);
            alert('Failed to save data: ' + err.message);
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(records.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedRecords = records.slice(startIndex, endIndex);

    return (
        <div className="w-full min-h-full bg-white flex flex-col">
            {/* Page Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div>
                    <h1 className="text-xl font-normal text-[#202124] tracking-tight">
                        Personnel Data Sheets
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={loadRecords}
                        disabled={loading}
                        className="font-medium text-slate-600 border-slate-200"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={handleAddNew}
                        className="bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold shadow-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Record
                    </Button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-8 flex-1 flex flex-col overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-[#1a3e62] mb-4" />
                        <p className="text-slate-500 font-medium">Loading records...</p>
                    </div>
                ) : error ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900">{error}</h3>
                        <p className="text-slate-500 mb-6 max-w-xs">There was an issue retrieving the personnel records.</p>
                        <Button onClick={loadRecords} variant="default">Try Again</Button>
                    </div>
                ) : records.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                            <FileText className="h-10 w-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No Personnel Data Records Yet</h3>
                        <p className="text-slate-500 mb-8 max-w-sm">
                            Click the "Add New Record" button to create your first Personnel Data Sheet.
                        </p>
                        <Button
                            onClick={handleAddNew}
                            className="bg-[#1a3e62] hover:bg-[#122c46] shadow-md"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create PDS Record
                        </Button>
                    </div>
                ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white flex flex-col flex-1">
                        <div className="flex-1 overflow-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                                    <TableRow className="hover:bg-transparent border-b border-slate-200">
                                        <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap">Employee Name</TableHead>
                                        <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap">Employee No.</TableHead>
                                        <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap">Date Started</TableHead>
                                        <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap">Contact Info</TableHead>
                                        <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap">Email</TableHead>
                                        <TableHead className="font-bold text-[#1a3e62] py-4 h-auto whitespace-nowrap text-right pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedRecords.map((record) => (
                                        <TableRow key={record.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border border-slate-100 shadow-sm">
                                                        <AvatarFallback className="bg-[#1a3e62] text-white font-semibold text-xs">
                                                            {record.firstName.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="font-semibold text-slate-900">
                                                        {`${record.surname}, ${record.firstName}`}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 font-medium text-slate-600">
                                                {record.employeeNumber || 'N/A'}
                                            </TableCell>
                                            <TableCell className="py-4 text-slate-600">
                                                {formatDate(record.dateStarted)}
                                            </TableCell>
                                            <TableCell className="py-4 text-slate-600">
                                                {record.cellphoneNumber}
                                            </TableCell>
                                            <TableCell className="py-4 text-slate-600">
                                                {record.emailAddress}
                                            </TableCell>
                                            <TableCell className="py-4 text-slate-600 text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleView(record)}
                                                        className="h-8 border-slate-200 text-slate-600 hover:bg-slate-50 font-medium px-4"
                                                    >
                                                        View
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleEdit(record)}
                                                        className="h-8 bg-[#1a3e62] hover:bg-[#122c46] text-white font-medium px-4 shadow-sm"
                                                    >
                                                        Edit
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="border-t border-slate-100">
                            <ContractPagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                startIndex={startIndex}
                                endIndex={endIndex}
                                totalItems={records.length}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Personnel Data Sheet Modal */}
            <PersonnelDataSheetModal
                open={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSavePersonnelData}
                initialData={selectedRecord}
                mode={modalMode}
            />
        </div>
    );
};

export default Information;
