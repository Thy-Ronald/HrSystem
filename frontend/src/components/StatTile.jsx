const StatTile = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 py-3">
    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</p>
  </div>
);

export default StatTile;
