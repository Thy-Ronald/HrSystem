import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Github,
    SunMoon,
    Plus,
    User,
    Loader2,
    Star,
    Trash2,
    Sun,
    Moon,
    Monitor,
    Key,
    CheckCircle2,
    AlertCircle,
    Eye,
    EyeOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { fetchRepositories, addTrackedRepository, removeTrackedRepository, fetchSetting, updateSetting } from '../services/api';
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
    const { theme, setTheme } = useTheme();
    const [activeCategory, setActiveCategory] = useState('Repository');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [repoName, setRepoName] = useState('');
    const [repositories, setRepositories] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRepo, setSelectedRepo] = useState(null);
    const trackedRepo = repositories[0];

    // GitHub Token states
    const [githubToken, setGithubToken] = useState('');
    const [isTokenLoading, setIsTokenLoading] = useState(false);
    const [isSavingToken, setIsSavingToken] = useState(false);
    const [tokenStatus, setTokenStatus] = useState(null); // 'success', 'error'
    const [tokenError, setTokenError] = useState('');
    const [showToken, setShowToken] = useState(false);

    // Suggestion states
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Fetch tracked repositories on mount
    const fetchTrackedRepositories = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchRepositories();
            const repoList = data.data || data; // Handle both wrapped and unwrapped for safety
            if (repoList && repoList.length > 0) {
                setRepositories([repoList[0]]);
            } else {
                setRepositories([]);
            }
        } catch (error) {
            console.error('Error fetching repositories:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch GitHub token
    const fetchGithubTokenStatus = useCallback(async () => {
        setIsTokenLoading(true);
        try {
            const token = await fetchSetting('github_token');
            setGithubToken(token || '');
        } catch (error) {
            console.error('Error fetching token status:', error);
        } finally {
            setIsTokenLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTrackedRepositories();
        fetchGithubTokenStatus();
    }, [fetchTrackedRepositories, fetchGithubTokenStatus]);

    const sidebarItems = [
        { label: 'Repository', icon: <Github className="w-4 h-4" />, id: 'Repository' },
        { label: 'Access Token', icon: <Key className="w-4 h-4" />, id: 'AccessToken' },
        { label: 'Dark Mode', icon: <SunMoon className="w-4 h-4" />, id: 'DarkMode' },
    ];

    const handleSaveToken = async () => {
        const token = githubToken.trim();
        if (!token) return;

        // Basic format validation for GitHub Personal Access Tokens
        // ghp_ for classic, github_pat_ for fine-grained
        const isValidFormat = token.startsWith('ghp_') || token.startsWith('github_pat_') || token.startsWith('gho_');

        if (!isValidFormat) {
            setTokenStatus('error');
            setTokenError('Invalid format. GitHub tokens should start with ghp_, github_pat_, or gho_');
            return;
        }

        setIsSavingToken(true);
        setTokenStatus(null);
        setTokenError('');
        try {
            await updateSetting({
                key: 'github_token',
                value: token,
                description: 'GitHub Personal Access Token'
            });
            setTokenStatus('success');
            setTimeout(() => setTokenStatus(null), 3000);
        } catch (error) {
            console.error('Error saving token:', error);
            setTokenStatus('error');
            setTokenError(error.message || 'Failed to update token');
        } finally {
            setIsSavingToken(false);
        }
    };

    // Debounced search for suggestions
    useEffect(() => {
        const timer = setTimeout(() => {
            if (repoName.trim().length >= 2) {
                // Only fetch suggestions if they don't already match the selected repo's full name
                if (!selectedRepo || repoName.trim() !== selectedRepo.fullName) {
                    fetchSuggestions(repoName.trim());
                }
            } else {
                setSuggestions([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [repoName, selectedRepo]);

    const fetchSuggestions = async (q) => {
        setIsSearching(true);
        try {
            const response = await fetch(`/api/github/search?q=${q}`);
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

    const handleAddRepo = async (selectedOverride = null) => {
        const finalRepo = selectedOverride || selectedRepo || {
            fullName: repoName.trim(),
            name: repoName.trim().split('/').pop(),
            owner: repoName.trim().split('/')[0]
        };

        if (finalRepo.fullName) {
            try {
                await addTrackedRepository(finalRepo);
                await fetchTrackedRepositories();
                setRepoName('');
                setSuggestions([]);
                setSelectedRepo(null);
                setIsModalOpen(false);
            } catch (error) {
                console.error('Error adding repository:', error);
            }
        }
    };

    const handleSelectSuggestion = (repo) => {
        setSelectedRepo(repo);
        setRepoName(repo.fullName);
        setSuggestions([]);
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

    return (
        <div className="flex h-[calc(100vh-140px)] w-full overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-slate-950 dark:border-slate-800">
            {/* Sidebar */}
            <div className="w-64 border-r bg-slate-50/50 p-4 flex flex-col gap-6 dark:bg-slate-900/50 dark:border-slate-800">
                {/* Profile */}
                <div className="flex items-center gap-3 px-2">
                    <Avatar className="h-10 w-10 border dark:border-slate-800">
                        <AvatarImage src={user?.avatar_url} />
                        <AvatarFallback className="dark:bg-slate-800">{user?.name?.charAt(0) || <User />}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-semibold truncate text-slate-900 dark:text-slate-100">{user?.name || 'Admin User'}</span>
                        <span className="text-[10px] text-slate-500 truncate dark:text-slate-400">{user?.email || 'admin@thy.com'}</span>
                    </div>
                </div>

                {/* Search */}
                <div className="relative px-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                    <Input
                        placeholder="Find a setting"
                        className="h-8 pl-8 text-xs bg-white border-slate-200 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
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
                                activeCategory === item.id
                                    ? "bg-slate-200 text-slate-900 font-medium dark:bg-slate-800 dark:text-slate-100"
                                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/50"
                            )}
                            onClick={() => setActiveCategory(item.id)}
                        >
                            <div className={cn(
                                "transition-colors",
                                activeCategory === item.id ? "text-slate-900 dark:text-slate-100" : "text-slate-500"
                            )}>
                                {item.icon}
                            </div>
                            {item.label}
                        </Button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto bg-white p-8 dark:bg-slate-950">
                {activeCategory === 'Repository' ? (
                    <div className="max-w-2xl space-y-6">
                        <div className="flex justify-start">
                            <Button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-[#1a73e8] hover:bg-[#185abc] text-white px-6 h-10 rounded-lg font-medium shadow-sm transition-all dark:bg-blue-600 dark:hover:bg-blue-700"
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
                                <div className="bg-white border border-[#dadce0] rounded-xl overflow-hidden hover:border-[#bdc1c6] transition-all duration-200 shadow-sm dark:bg-slate-900 dark:border-slate-800 dark:hover:border-slate-700">
                                    <div className="p-6">
                                        <div className="flex items-center gap-5">
                                            <Avatar className="h-14 w-14 border border-[#f1f3f4] dark:border-slate-800">
                                                <AvatarImage src={trackedRepo.avatarUrl} />
                                                <AvatarFallback className="bg-[#f8f9fa] text-[#5f6368] text-lg dark:bg-slate-800 dark:text-slate-400">
                                                    {trackedRepo.name?.[0]?.toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="text-lg font-semibold text-[#202124] mb-0.5 dark:text-slate-100">
                                                    {trackedRepo.name}
                                                </h3>
                                                <p className="text-sm text-[#5f6368] dark:text-slate-400">
                                                    {trackedRepo.fullName}
                                                </p>
                                                <div className="flex items-center gap-3 mt-2">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20">
                                                        Active
                                                    </span>
                                                    {trackedRepo.stars !== undefined && (
                                                        <span className="flex items-center gap-1 text-xs text-[#5f6368] dark:text-slate-400">
                                                            <Star className="w-3 h-3 fill-[#5f6368] dark:fill-slate-500" />
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
                            <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-[#dadce0] rounded-xl bg-[#f8f9fa] transition-colors hover:bg-slate-50 dark:bg-slate-900/50 dark:border-slate-800 dark:hover:bg-slate-900">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 shadow-md dark:bg-slate-800">
                                    <Github className="w-8 h-8 text-[#5f6368] dark:text-slate-400" />
                                </div>
                                <h3 className="text-xl font-medium text-[#202124] mb-2 dark:text-slate-100">No repository tracked</h3>
                                <p className="text-sm text-[#5f6368] text-center mb-8 max-w-sm dark:text-slate-400">
                                    Track a GitHub repository to start analyzing contributor performance and code statistics.
                                </p>
                                <Button
                                    className="bg-[#1a73e8] hover:bg-[#185abc] text-white px-8 h-11 rounded-lg font-medium shadow-md transition-all active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-700"
                                    onClick={() => setIsModalOpen(true)}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Repository
                                </Button>
                            </div>
                        )}
                    </div>
                ) : activeCategory === 'AccessToken' ? (
                    <div className="max-w-2xl space-y-8 animate-in fade-in duration-500">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 dark:text-slate-100">Access Token</h2>
                            <p className="text-slate-500 dark:text-slate-400">Configure your GitHub Personal Access Token to enable repository tracking and analytics.</p>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                                    <Key className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                        {githubToken ? 'Change token' : 'Add token'}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {githubToken ? 'Update your existing token with a new one.' : 'Enter a new GitHub PAT to start.'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">GitHub Personal Access Token</label>
                                    <div className="relative max-w-md">
                                        <Input
                                            type={showToken ? "text" : "password"}
                                            value={githubToken}
                                            onChange={(e) => setGithubToken(e.target.value)}
                                            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                                            className="h-12 border-slate-200 focus-visible:ring-blue-500 pr-12 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowToken(!showToken)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors"
                                        >
                                            {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                        {isTokenLoading && (
                                            <Loader2 className="absolute -right-8 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-slate-400" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-relaxed">
                                        Note: The token is encrypted in our database and used only for GitHub API requests.
                                    </p>
                                </div>

                                <div className="flex items-center gap-4 pt-2">
                                    <Button
                                        onClick={handleSaveToken}
                                        disabled={isSavingToken || !githubToken.trim()}
                                        className="bg-[#1a73e8] hover:bg-[#185abc] text-white px-8 h-11 rounded-xl font-medium shadow-md transition-all active:scale-95 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
                                    >
                                        {isSavingToken ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            githubToken ? 'Update Token' : 'Save Token'
                                        )}
                                    </Button>

                                    {tokenStatus === 'success' && (
                                        <div className="flex items-center gap-2 text-green-600 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span className="text-sm font-medium">Token updated successfully</span>
                                        </div>
                                    )}

                                    {tokenStatus === 'error' && (
                                        <div className="flex items-center gap-2 text-red-500 animate-in fade-in slide-in-from-left-2 duration-300">
                                            <AlertCircle className="w-5 h-5" />
                                            <span className="text-sm font-medium">{tokenError || 'Failed to update token'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4 dark:bg-amber-500/10 dark:border-amber-500/20">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 dark:bg-amber-500/20">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Token Expiration</h4>
                                <p className="text-sm text-amber-700 leading-relaxed dark:text-amber-300">
                                    Remember to update your token if it expires in GitHub. We recommend using a token with `repo` and `read:user` scopes.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2 dark:text-slate-100">Appearance</h2>
                            <p className="text-slate-500 dark:text-slate-400">Customize how the HR System looks on your device.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Light Mode Card */}
                            <div
                                onClick={() => setTheme('light')}
                                className={cn(
                                    "relative cursor-pointer group transition-all duration-300",
                                    "rounded-2xl border-2 p-1 overflow-hidden",
                                    theme === 'light' ? "border-blue-500 ring-4 ring-blue-50 shadow-lg dark:ring-blue-900/20" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                                )}
                            >
                                <div className="aspect-[16/10] rounded-xl bg-slate-50 border border-slate-200 overflow-hidden relative dark:border-slate-800">
                                    {/* Mock UI for Light */}
                                    <div className="absolute inset-x-2 top-2 h-3 bg-white border border-slate-200 rounded shadow-sm flex items-center px-1 gap-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                        <div className="w-4 h-1 rounded-full bg-slate-100"></div>
                                    </div>
                                    <div className="absolute left-2 top-7 bottom-2 w-10 bg-white border border-slate-200 rounded shadow-sm"></div>
                                    <div className="absolute left-14 right-2 top-7 bottom-2 bg-white border border-slate-200 rounded shadow-sm p-2 space-y-1">
                                        <div className="w-full h-2 bg-slate-50 rounded"></div>
                                        <div className="w-2/3 h-2 bg-slate-50 rounded"></div>
                                    </div>
                                    {theme === 'light' && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                            theme === 'light' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                        )}>
                                            <Sun className="w-4 h-4" />
                                        </div>
                                        <span className={cn("font-medium", theme === 'light' ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400")}>Light</span>
                                    </div>
                                </div>
                            </div>

                            {/* Dark Mode Card */}
                            <div
                                onClick={() => setTheme('dark')}
                                className={cn(
                                    "relative cursor-pointer group transition-all duration-300",
                                    "rounded-2xl border-2 p-1 overflow-hidden",
                                    theme === 'dark' ? "border-blue-500 ring-4 ring-blue-50 shadow-lg dark:ring-blue-900/20" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                                )}
                            >
                                <div className="aspect-[16/10] rounded-xl bg-slate-900 border border-slate-800 overflow-hidden relative">
                                    {/* Mock UI for Dark */}
                                    <div className="absolute inset-x-2 top-2 h-3 bg-slate-800 border border-slate-700 rounded shadow-sm flex items-center px-1 gap-1">
                                        <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                        <div className="w-4 h-1 rounded-full bg-slate-600"></div>
                                    </div>
                                    <div className="absolute left-2 top-7 bottom-2 w-10 bg-slate-800 border border-slate-700 rounded shadow-sm"></div>
                                    <div className="absolute left-14 right-2 top-7 bottom-2 bg-slate-800 border border-slate-700 rounded shadow-sm p-2 space-y-1">
                                        <div className="w-full h-2 bg-slate-700 rounded"></div>
                                        <div className="w-2/3 h-2 bg-slate-700 rounded"></div>
                                    </div>
                                    {theme === 'dark' && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                            theme === 'dark' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                        )}>
                                            <Moon className="w-4 h-4" />
                                        </div>
                                        <span className={cn("font-medium", theme === 'dark' ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400")}>Dark</span>
                                    </div>
                                </div>
                            </div>

                            {/* System Mode Card */}
                            <div
                                onClick={() => setTheme('system')}
                                className={cn(
                                    "relative cursor-pointer group transition-all duration-300",
                                    "rounded-2xl border-2 p-1 overflow-hidden",
                                    theme === 'system' ? "border-blue-500 ring-4 ring-blue-50 shadow-lg dark:ring-blue-900/20" : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                                )}
                            >
                                <div className="aspect-[16/10] rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative dark:border-slate-800">
                                    {/* Split UI for System */}
                                    <div className="absolute inset-0 flex">
                                        <div className="flex-1 bg-slate-50"></div>
                                        <div className="flex-1 bg-slate-900"></div>
                                    </div>
                                    <div className="absolute inset-x-2 top-2 h-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded shadow-sm flex items-center px-1 gap-1">
                                        <div className="w-1 h-1 rounded-full bg-white/30"></div>
                                        <div className="w-4 h-1 rounded-full bg-white/20"></div>
                                    </div>
                                    <div className="absolute left-2 top-7 bottom-2 w-10 bg-white shadow-sm border border-slate-200 rounded"></div>
                                    <div className="absolute right-2 top-7 bottom-2 w-10 bg-slate-800 shadow-sm border border-slate-700 rounded"></div>

                                    {theme === 'system' && (
                                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-md animate-in zoom-in">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                            theme === 'system' ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                        )}>
                                            <Monitor className="w-4 h-4" />
                                        </div>
                                        <span className={cn("font-medium", theme === 'system' ? "text-slate-900 dark:text-slate-100" : "text-slate-600 dark:text-slate-400")}>System</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex items-start gap-4 dark:bg-blue-500/10 dark:border-blue-500/20">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 dark:bg-blue-500/20">
                                <SunMoon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Premium Visual Experience</h4>
                                <p className="text-sm text-blue-700 leading-relaxed dark:text-blue-300">
                                    Switching themes will apply changes across the entire dashboard instantly. System mode automatically adjusts based on your OS preferences.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Change Repository Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[450px] p-0 rounded-xl border-none shadow-2xl dark:bg-slate-900">
                    <div className="p-6 space-y-6 flex flex-col">
                        <div className="space-y-4 relative">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[#202124] dark:text-slate-200">Repository name</label>
                                <div className="relative">
                                    <Input
                                        value={repoName}
                                        onChange={(e) => {
                                            setRepoName(e.target.value);
                                            if (selectedRepo && e.target.value !== selectedRepo.fullName) {
                                                setSelectedRepo(null);
                                            }
                                        }}
                                        autoFocus
                                        placeholder="e.g. owner/repo"
                                        className="h-12 border-[#dadce0] focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-[#1a73e8] rounded-lg pr-10 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-slate-400" />
                                    )}
                                </div>
                            </div>

                            {/* Suggestions List */}
                            {suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#dadce0] rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-[#f1f3f4] dark:bg-slate-900 dark:border-slate-800 dark:divide-slate-800">
                                    {suggestions.map((repo) => (
                                        <button
                                            key={repo.id}
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => handleSelectSuggestion(repo)}
                                            className="w-full text-left px-5 py-4 hover:bg-[#f8f9fa] dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group cursor-pointer"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-[#f1f3f4] dark:bg-slate-800 flex items-center justify-center group-hover:bg-[#e8f0fe] dark:group-hover:bg-blue-500/10">
                                                    <Github className="h-5 w-5 text-[#5f6368] dark:text-slate-400 group-hover:text-[#1a73e8] dark:group-hover:text-blue-400" />
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-sm font-semibold text-[#202124] dark:text-slate-100 group-hover:text-[#1a73e8] dark:group-hover:text-blue-400 truncate max-w-[280px]">
                                                        {repo.fullName}
                                                    </span>
                                                    <span className="text-xs text-[#5f6368] dark:text-slate-400 truncate max-w-[280px]">
                                                        {repo.description || 'No description'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs font-medium text-[#5f6368] dark:text-slate-400">
                                                <Star className="h-3.5 w-3.5 fill-[#fbbc04] text-[#fbbc04]" />
                                                {repo.stars.toLocaleString()}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {repoName.trim().length >= 2 && !isSearching && suggestions.length === 0 && (!selectedRepo || repoName.trim() !== selectedRepo.fullName) && (

                                <div className="absolute top-full left-0 right-0 mt-1 bg-[#f8f9fa] dark:bg-slate-950 border border-[#dadce0] dark:border-slate-800 rounded-xl p-8 text-center space-y-3 z-50 shadow-xl">
                                    <div className="flex justify-center">
                                        <div className="w-14 h-14 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm">
                                            <Search className="h-7 w-7 text-[#dadce0] dark:text-slate-600" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-base font-medium text-[#202124] dark:text-slate-100">No repositories found</p>
                                        <p className="text-sm text-[#5f6368] dark:text-slate-400 max-w-xs mx-auto">
                                            We couldn't find any repositories matching "{repoName}"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setRepoName('');
                                    setSuggestions([]);
                                    setSelectedRepo(null);
                                }}
                                className="h-11 px-6 text-[#5f6368] dark:text-slate-400 font-medium rounded-lg hover:bg-[#f1f3f4] dark:hover:bg-slate-800"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleAddRepo()}
                                disabled={!repoName.trim()}
                                className="h-11 px-8 bg-[#1a73e8] hover:bg-[#185abc] text-white font-medium rounded-lg shadow-md transition-all active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-700"
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
