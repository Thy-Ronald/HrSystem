import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Github,
    SunMoon,
    Plus,
    User,
    Loader2,
    Star,
    Trash2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchRepositories, addTrackedRepository, removeTrackedRepository } from '../services/api';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const Settings = () => {
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState('Repository');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [repoName, setRepoName] = useState('');
    const [repositories, setRepositories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Suggestion states
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Fetch tracked repositories on mount
    const fetchTrackedRepositories = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchRepositories();
            if (data && data.length > 0) {
                setRepositories([data[0]]);
            } else {
                setRepositories([]);
            }
        } catch (error) {
            console.error('Error fetching repositories:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTrackedRepositories();
    }, [fetchTrackedRepositories]);

    const sidebarItems = [
        { label: 'Repository', icon: <Github className="w-4 h-4" />, id: 'Repository' },
        { label: 'Dark Mode', icon: <SunMoon className="w-4 h-4" />, id: 'DarkMode' },
    ];

    // Debounced search for suggestions
    useEffect(() => {
        const timer = setTimeout(() => {
            if (repoName.trim().length >= 2) {
                fetchSuggestions(repoName.trim());
            } else {
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [repoName]);

    const fetchSuggestions = async (q) => {
        setIsSearching(true);
        try {
            const response = await fetch(`http://localhost:4000/api/github/search?q=${q}`);
            const data = await response.json();
            if (data.success) {
                setSuggestions(data.data);
            }
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddRepo = async (selectedRepo = null) => {
        const repoData = selectedRepo || {
            fullName: repoName.trim(),
            name: repoName.trim().split('/').pop(),
            owner: repoName.trim().split('/')[0]
        };

        if (repoData.fullName) {
            try {
                await addTrackedRepository(repoData);
                await fetchTrackedRepositories();
                setRepoName('');
                setSuggestions([]);
                setIsModalOpen(false);
            } catch (error) {
                console.error('Error adding repository:', error);
            }
        }
    };

    const handleDeleteRepo = async (fullName) => {
        if (window.confirm(`Are you sure you want to remove ${fullName}?`)) {
            try {
                await removeTrackedRepository(fullName);
                await fetchTrackedRepositories();
            } catch (error) {
                console.error('Error deleting repository:', error);
            }
        }
    };

    const trackedRepo = repositories[0];

    return (
        <div className="flex h-[calc(100vh-140px)] w-full overflow-hidden rounded-lg border bg-white shadow-sm">
            {/* Sidebar */}
            <div className="w-64 border-r bg-slate-50/50 p-4 flex flex-col gap-6">
                {/* Profile */}
                <div className="flex items-center gap-3 px-2">
                    <Avatar className="h-10 w-10 border">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback>{user?.name?.charAt(0) || <User />}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold truncate text-slate-900">{user?.name || 'Admin User'}</span>
                        <span className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@thy.com'}</span>
                    </div>
                </div>

                {/* Search */}
                <div className="relative px-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                        placeholder="Find a setting"
                        className="h-8 pl-8 text-xs bg-white border-slate-200"
                    />
                </div>

                {/* Nav Items */}
                <nav className="flex flex-col gap-1">
                    {sidebarItems.map((item) => (
                        <Button
                            key={item.id}
                            variant={activeCategory === item.id ? "secondary" : "ghost"}
                            className={cn(
                                "justify-start gap-3 h-9 px-3 text-sm font-normal",
                                activeCategory === item.id ? "bg-slate-200 text-slate-900 font-medium" : "text-slate-600 hover:text-slate-900"
                            )}
                            onClick={() => setActiveCategory(item.id)}
                        >
                            <div className={cn(
                                "transition-colors",
                                activeCategory === item.id ? "text-slate-900" : "text-slate-500"
                            )}>
                                {item.icon}
                            </div>
                            {item.label}
                        </Button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-white p-8">
                {activeCategory === 'Repository' ? (
                    <div className="max-w-2xl space-y-6">
                        {/* Action Row at Top */}
                        <div className="flex justify-start">
                            <Button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-[#1a73e8] hover:bg-[#185abc] text-white px-6 h-10 rounded-lg font-medium shadow-sm transition-all"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {repositories.length > 0 ? 'Change Repository' : 'Add Repository'}
                            </Button>
                        </div>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            </div>
                        ) : trackedRepo ? (
                            <div className="space-y-4">
                                <div className="bg-white border border-[#dadce0] rounded-xl overflow-hidden hover:border-[#bdc1c6] transition-all duration-200 shadow-sm">
                                    <div className="p-6">
                                        <div className="flex items-center gap-5">
                                            <Avatar className="h-14 w-14 border border-[#f1f3f4]">
                                                <AvatarImage src={trackedRepo.avatarUrl} />
                                                <AvatarFallback className="bg-[#f8f9fa] text-[#5f6368] text-lg">
                                                    {trackedRepo.name?.[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="text-lg font-semibold text-[#202124] mb-0.5">
                                                    {trackedRepo.name}
                                                </h3>
                                                <p className="text-sm text-[#5f6368]">
                                                    {trackedRepo.fullName}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                                                        Active
                                                    </span>
                                                    {trackedRepo.stars !== undefined && (
                                                        <span className="flex items-center gap-1 text-xs text-[#5f6368]">
                                                            <Star className="w-3 h-3 fill-[#5f6368]" />
                                                            {trackedRepo.stars.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-[#dadce0] rounded-xl bg-[#f8f9fa] transition-colors hover:bg-slate-50">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-md">
                                    <Github className="w-8 h-8 text-[#5f6368]" />
                                </div>
                                <h3 className="text-xl font-medium text-[#202124] mb-2">No repository tracked</h3>
                                <p className="text-sm text-[#5f6368] text-center mb-8 max-w-sm">
                                    Track a GitHub repository to start analyzing contributor performance and code statistics.
                                </p>
                                <Button
                                    className="bg-[#1a73e8] hover:bg-[#185abc] text-white px-8 h-11 rounded-lg font-medium shadow-md transition-all active:scale-95"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Repository
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        {activeCategory} Content Coming Soon
                    </div>
                )}
            </div>

            {/* Add/Change Repository Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-xl border-none shadow-2xl">
                    <div className="p-8 space-y-8">
                        <div>
                            <h2 className="text-2xl font-semibold text-[#202124] mb-1">
                                {trackedRepo ? 'Change Repository' : 'Add Repository'}
                            </h2>
                            <p className="text-sm text-[#5f6368]">
                                {trackedRepo ? 'Select a new repository to track. Former data will be replaced.' : 'Enter the name of the repository you want to track.'}
                            </p>
                        </div>

                        <div className="space-y-4 relative">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#202124]">Repository name</label>
                                <div className="relative">
                                    <Input
                                        value={repoName}
                                        onChange={(e) => setRepoName(e.target.value)}
                                        autoFocus
                                        placeholder="e.g. owner/repo"
                                        className="h-12 border-[#dadce0] focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-[#1a73e8] rounded-lg pr-10"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-slate-400" />
                                    )}
                                </div>
                            </div>

                            {/* Suggestions List */}
                            {suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dadce0] rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-[#f1f3f4]">
                                    {suggestions.map((repo) => (
                                        <button
                                            key={repo.id}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleAddRepo(repo)}
                                            className="w-full text-left px-5 py-4 hover:bg-[#f8f9fa] transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-[#f1f3f4] flex items-center justify-center group-hover:bg-[#e8f0fe]">
                                                    <Github className="h-5 w-5 text-[#5f6368] group-hover:text-[#1a73e8]" />
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-sm font-semibold text-[#202124] group-hover:text-[#1a73e8] truncate max-w-[280px]">
                                                        {repo.fullName}
                                                    </span>
                                                    <span className="text-xs text-[#5f6368] truncate max-w-[280px]">
                                                        {repo.description || 'No description'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-[#5f6368]">
                                                <Star className="h-3.5 w-3.5 fill-[#fbbc04] text-[#fbbc04]" />
                                                {repo.stars.toLocaleString()}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {repoName.trim().length >= 2 && !isSearching && suggestions.length === 0 && (
                                <div className="mt-2 bg-[#f8f9fa] border border-[#dadce0] rounded-xl p-8 text-center space-y-3">
                                    <div className="flex justify-center">
                                        <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm">
                                            <Search className="h-7 w-7 text-[#dadce0]" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-base font-medium text-[#202124]">No repositories found</p>
                                        <p className="text-sm text-[#5f6368] max-w-xs mx-auto">
                                            We couldn't find any repositories matching "{repoName}"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 pb-4">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setRepoName('');
                                    setSuggestions([]);
                                }}
                                className="h-11 px-6 text-[#5f6368] font-medium rounded-lg hover:bg-[#f1f3f4]"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleAddRepo()}
                                disabled={!repoName.trim()}
                                className="h-11 px-8 bg-[#1a73e8] hover:bg-[#185abc] text-white font-medium rounded-lg shadow-md transition-all active:scale-95"
                            >
                                Confirm
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Settings;
