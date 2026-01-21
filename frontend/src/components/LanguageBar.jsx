const LanguageBar = ({ language, count, max }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-sm text-slate-700">
      <span>{language}</span>
      <span className="text-xs text-slate-500">{count}</span>
    </div>
    <div className="h-2 rounded-full bg-slate-100">
      <div
        className="h-2 rounded-full bg-brand-500 transition-all"
        style={{ width: `${(count / max) * 100 || 0}%` }}
      />
    </div>
  </div>
);

export default LanguageBar;
