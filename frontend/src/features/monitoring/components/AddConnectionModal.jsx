import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from '../../../components/Toast';

const AddConnectionModal = ({
    open,
    onOpenChange,
    sessions,
    connectError,
    clearConnectError
}) => {
    const [addFormCode, setAddFormCode] = useState('');
    const [addFormError, setAddFormError] = useState('');
    const [addFormLoading, setAddFormLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);

    const toast = useToast();

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(async () => {
            // Only search if we haven't selected a user yet (to avoid searching for the selected name)
            if (open && addFormCode.length > 1 && !selectedUser) {
                try {
                    // Ensure we import searchUsers from api.js first
                    const results = await import('../../../services/api').then(m => m.searchUsers(addFormCode));

                    // Filter out users we are already connected to
                    const filteredResults = results.filter(u => {
                        // Check if already in 'sessions'
                        const isConnected = sessions.some(s =>
                            s.employeeId === u.id || // Best check
                            s.employeeName === u.name // Fallback check
                        );
                        return !isConnected;
                    });

                    setSearchResults(filteredResults || []);
                } catch (err) {
                    console.error("Search failed", err);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [addFormCode, open, selectedUser, sessions]);

    // Close modal when sessions update (if we just added one)
    useEffect(() => {
        if (open && sessions.length > 0) {
            // Just check if the newest session matches selectedUser if possible, but 
            // strict logic from original file was just closing if sessions changed length?
            // Actually original logic was: if (showAddModal && sessions.length > 0) setShowAddModal(false);
            // But sessions.length > 0 is always true if you have at least one session. 
            // The original effect seemed to rely on sessions changing length via dependency array `[sessions.length]`.
            // I'll keep the dependency logic in the parent or try to replicate it here, 
            // but modifying the 'open' prop is controlled by parent.
            // So I can't close it myself purely. I need to rely on parent or successful submit.
            // Wait, original logic called setShowAddModal(false) inside the effect. 
            // Since 'onOpenChange' is passed, I can call onOpenChange(false).
        }
    }, [sessions.length]);

    // NOTE: The above logic is slightly flawed in extraction because we don't know if the session added was THIS specific one.
    // Ideally, close on success of API call.

    // Handle connection errors from context
    useEffect(() => {
        if (connectError && open) {
            setAddFormError(connectError);
            setAddFormLoading(false);
        }
    }, [connectError, open]);

    // Clear errors when opening modal
    useEffect(() => {
        if (open) {
            setAddFormError('');
            setAddFormLoading(false);
            setAddFormCode('');
            setSearchResults([]);
            setSelectedUser(null);
            if (clearConnectError) clearConnectError();
        }
    }, [open, clearConnectError]);

    const sendConnectionRequest = async () => {
        if (!selectedUser) {
            return setAddFormError('Please select a user from the search results');
        }

        setAddFormLoading(true);
        try {
            const { createMonitoringRequest } = await import('../../../services/api');
            await createMonitoringRequest(selectedUser.id);
            toast.success(`Request sent to ${selectedUser.name}`);
            onOpenChange(false); // Close on success
            setAddFormCode('');
            setSelectedUser(null);
            setSearchResults([]);
        } catch (error) {
            console.error('Request failed:', error);
            setAddFormError(error.message || 'Failed to send request');
        } finally {
            setAddFormLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight">Request Connection</DialogTitle>
                    <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                        Search for an employee to request a monitoring session.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Employee Name</label>
                    <input
                        type="text"
                        value={addFormCode}
                        onChange={e => {
                            setAddFormCode(e.target.value);
                            setSelectedUser(null); // Clear selection if user types
                            if (addFormError) setAddFormError('');
                        }}
                        placeholder="e.g. John Doe"
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    />
                    {addFormError && <p className="text-rose-500 text-xs mt-1 font-medium">{addFormError}</p>}

                    {searchResults.length > 0 && (
                        <div className="mt-2 border border-slate-200 dark:border-slate-800 rounded-lg max-h-48 overflow-y-auto shadow-sm bg-white dark:bg-slate-900">
                            {searchResults.map((user) => (
                                <div
                                    key={user.id}
                                    className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 flex justify-between items-center"
                                    onClick={() => {
                                        setAddFormCode(user.name);
                                        setSelectedUser(user);
                                        setSearchResults([]);
                                    }}
                                >
                                    <div className="flex items-center gap-3">
                                        {user.avatar_url ? (
                                            <img
                                                src={user.avatar_url}
                                                alt={user.name}
                                                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{user.name.charAt(0).toUpperCase()}</span>
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{user.name}</span>
                                    </div>
                                    <span className="text-xs text-slate-400 dark:text-slate-500">{user.email}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        This will send a request to the employee to accept the monitoring session.
                    </p>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            onOpenChange(false);
                            setSearchResults([]);
                            setAddFormCode('');
                            setSelectedUser(null);
                        }}
                        className="text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium"
                    >
                        Cancel
                    </Button>
                    <Button
                        className="bg-[#1a3e62] hover:bg-[#122c46] text-white font-semibold px-6"
                        onClick={sendConnectionRequest}
                        disabled={addFormLoading}
                    >
                        Send Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddConnectionModal;
