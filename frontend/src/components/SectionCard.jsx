const SectionCard = ({
  title,
  description,
  action,
  children,
  className = '',
  showKicker = true,
}) => {
  const hasHeader = Boolean(title || description || action || showKicker);

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white/70 p-6 shadow-sm backdrop-blur-sm ${className}`}
    >
      {hasHeader && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            {showKicker && (
              <p className="text-xs uppercase tracking-[0.2em] text-brand-600">HR Ops</p>
            )}
            {title && <h2 className="text-xl font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
};

export default SectionCard;
