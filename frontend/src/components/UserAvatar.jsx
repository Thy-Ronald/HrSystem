import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const UserAvatar = ({ name, avatarUrl, className, size = "md" }) => {
    const sizeClasses = {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12"
    };

    return (
        <Avatar className={cn(sizeClasses[size] || sizeClasses.md, "border border-slate-200 dark:border-slate-800 shadow-sm", className)}>
            <AvatarImage src={avatarUrl} alt={name} className="object-cover" />
            <AvatarFallback className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 dark:text-slate-400">
                {name ? name.charAt(0).toUpperCase() : '?'}
            </AvatarFallback>
        </Avatar>
    );
};
