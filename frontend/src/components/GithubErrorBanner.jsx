import React from 'react';
import { Key, Settings as SettingsIcon, AlertCircle, ArrowRight, ServerCrash, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GithubErrorBanner = ({ title, message, onNavigate, variant = 'auth', className }) => {
    const isAuth = variant === 'auth';

    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300",
            className
        )}>
            <div className="relative mb-6">
                <div className={cn(
                    "p-6 rounded-full",
                    isAuth ? "bg-red-50 dark:bg-red-500/10" : "bg-amber-50 dark:bg-amber-500/10"
                )}>
                    {isAuth ? (
                        <Key className="h-12 w-12 text-red-500 dark:text-red-400" />
                    ) : (
                        <ServerCrash className="h-12 w-12 text-amber-600 dark:text-amber-500" />
                    )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-1 rounded-full">
                    <AlertCircle className={cn(
                        "h-6 w-6 fill-white dark:fill-slate-900",
                        isAuth ? "text-red-600" : "text-amber-600"
                    )} />
                </div>
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                {title || (isAuth ? "GitHub Authentication Failed" : "Server Connection Error")}
            </h3>

            <p className="text-slate-500 dark:text-slate-400 max-w-md text-center mb-8 leading-relaxed">
                {message || (isAuth
                    ? "Please check if your GitHub Personal Access Token is still valid and not expired."
                    : "We're having trouble reaching the server. Please check your connection and try again.")
                }
            </p>

            <Button
                onClick={() => isAuth ? (onNavigate && onNavigate('settings')) : window.location.reload()}
                className={cn(
                    "px-8 h-11 rounded-xl font-medium shadow-md transition-all active:scale-95 flex items-center gap-2",
                    isAuth
                        ? "bg-[#1a73e8] hover:bg-[#185abc] text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100"
                )}
            >
                {isAuth ? (
                    <>
                        <SettingsIcon className="w-4 h-4" />
                        Go to Settings
                        <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                ) : (
                    <>
                        <RefreshCw className="w-4 h-4" />
                        Retry Request
                    </>
                )}
            </Button>
        </div>
    );
};

export default GithubErrorBanner;
