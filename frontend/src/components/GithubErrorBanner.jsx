import React from 'react';
import { Key, Settings as SettingsIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GithubErrorBanner = ({ title, message, onNavigate, className }) => {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300",
            className
        )}>
            <div className="relative mb-6">
                <div className="bg-red-50 dark:bg-red-500/10 p-6 rounded-full">
                    <Key className="h-12 w-12 text-red-500 dark:text-red-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-1 rounded-full">
                    <AlertCircle className="h-6 w-6 text-red-600 fill-white dark:fill-slate-900" />
                </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {title || "GitHub Authentication Failed"}
            </h3>

            <p className="text-slate-500 dark:text-slate-400 max-w-md text-center mb-8 leading-relaxed">
                {message || "Your Personal Access Token might be invalid or expired. Please check your settings to ensure repository tracking works correctly."}
            </p>

            <Button
                onClick={() => onNavigate && onNavigate('settings')}
                className="bg-[#1a73e8] hover:bg-[#185abc] text-white px-8 h-11 rounded-xl font-medium shadow-md transition-all active:scale-95 flex items-center gap-2 dark:bg-blue-600 dark:hover:bg-blue-700"
            >
                <SettingsIcon className="w-4 h-4" />
                Go to Settings
                <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
        </div>
    );
};

export default GithubErrorBanner;
