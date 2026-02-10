import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    ChevronRight,
    Github,
    SunMoon,
    Plus,
    User,
    X,
    Loader2,
    Star
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const Settings = () => {
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState('Repository');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [repoName, setRepoName] = useState('');
    const [repositories, setRepositories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Suggestion states
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

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

    const handleAddRepo = (selectedRepo = null) => {
        const name = selectedRepo ? (typeof selectedRepo === 'string' ? selectedRepo : selectedRepo.fullName) : repoName.trim();

        if (name) {
            const newRepo = {
                id: repositories.length + 1,
                name: name,
                status: 'Active'
            };
            setRepositories([...repositories, newRepo]);
            setRepoName('');
            setSuggestions([]);
            setIsModalOpen(false);
        }
    };

    const filteredRepositories = repositories.filter(repo =>
        repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.id.toString().includes(searchQuery)
    );

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
            <div className="flex-1 overflow-y-auto bg-white p-6">
                {activeCategory === 'Repository' ? (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <Button
                                onClick={() => setIsModalOpen(true)}
                                className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 h-9 text-sm font-normal rounded-md"
                            >
                                Add Repository
                            </Button>
                        </div>

                        <div className="border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent border-b">
                                        <TableHead className="w-[100px] text-slate-500 font-medium h-12 px-4">Id</TableHead>
                                        <TableHead className="text-slate-500 font-medium h-12 px-4 text-center">Repository</TableHead>
                                        <TableHead className="text-slate-500 font-medium h-12 px-4 text-center">Status</TableHead>
                                        <TableHead className="text-right h-12 px-4">
                                            <div className="relative inline-block w-48 text-left">
                                                <Input
                                                    placeholder="Type to search"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="h-9 text-sm bg-white border-slate-200 font-normal"
                                                />
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRepositories.length > 0 ? (
                                        filteredRepositories.map((repo) => (
                                            <TableRow key={repo.id} className="border-b last:border-0">
                                                <TableCell className="font-medium px-4 h-12">{repo.id}</TableCell>
                                                <TableCell className="text-center px-4 h-12">{repo.name}</TableCell>
                                                <TableCell className="text-center px-4 h-12">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        {repo.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right px-4 h-12"></TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-slate-400 font-normal italic">
                                                No Data
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        {activeCategory} Content Coming Soon
                    </div>
                )}
            </div>

            {/* Add Repository Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-[500px] p-6 shadow-2xl">
                    <div className="space-y-8">
                        <h2 className="text-2xl text-slate-700 font-normal">Add Repository</h2>

                        <div className="space-y-3 relative">
                            <label className="text-base text-slate-500 font-normal">Repository name</label>
                            <div className="relative">
                                <Input
                                    value={repoName}
                                    onChange={(e) => setRepoName(e.target.value)}
                                    autoFocus
                                    className="h-12 border-slate-200 focus-visible:ring-offset-0 focus-visible:ring-1 focus-visible:ring-blue-400 rounded-md pr-10"
                                />
                                {isSearching && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-slate-400" />
                                )}
                            </div>

                            {/* Suggestions List */}
                            {suggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                    {suggestions.map((repo) => (
                                        <button
                                            key={repo.id}
                                            onClick={() => handleAddRepo(repo)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b last:border-0 flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                                                    <Github className="h-4 w-4 text-slate-500" />
                                                </div>
                                                <div className="flex flex-col overflow-hidden">
                                                    <span className="text-sm font-medium text-slate-900 group-hover:text-blue-600 truncate max-w-[300px]">
                                                        {repo.fullName}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 truncate max-w-[300px]">
                                                        {repo.description || 'No description'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                <Star className="h-3 w-3 fill-slate-400" />
                                                {repo.stars.toLocaleString()}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {repoName.trim().length >= 2 && !isSearching && suggestions.length === 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 p-6 text-center space-y-2">
                                    <div className="flex justify-center">
                                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
                                            <Search className="h-6 w-6 text-slate-300" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-slate-900">No repositories found</p>
                                        <p className="text-xs text-slate-500 line-clamp-2">
                                            We couldn't find any repositories matching "{repoName}"
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="h-11 px-8 text-slate-500 font-normal border-slate-200 rounded-md hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => handleAddRepo()}
                                disabled={!repoName.trim()}
                                className="h-11 px-8 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-normal rounded-md"
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
