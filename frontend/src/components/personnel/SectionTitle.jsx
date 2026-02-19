import React from 'react';

const SectionTitle = ({ title }) => (
    <div className="mt-8 mb-4">
        <h3 className="text-sm font-bold text-[#1a3e62] dark:text-blue-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900 p-2 rounded-md border-l-4 border-[#1a3e62] dark:border-blue-600">
            {title}
        </h3>
    </div>
);

export default SectionTitle;
