type EmptyStateProps = {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export const EmptyState = ({ icon, title, description, actionLabel, onAction }: EmptyStateProps) => (
  <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
    <p className="text-4xl">{icon}</p>
    <p className="mt-3 text-sm font-medium text-white/80">{title}</p>
    <p className="mt-1 text-xs text-slate-300/70">{description}</p>
    {actionLabel && onAction && (
      <button onClick={onAction}
        className="mt-4 rounded-full border border-brand-300/60 bg-brand-500/50 px-5 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-500/70">
        {actionLabel}
      </button>
    )}
  </div>
);
