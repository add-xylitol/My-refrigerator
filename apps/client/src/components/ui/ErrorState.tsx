type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export const ErrorState = ({ message, onRetry, retryLabel = '重试' }: ErrorStateProps) => (
  <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-center">
    <p className="text-2xl">⚠️</p>
    <p className="mt-2 text-sm text-red-200">{message}</p>
    {onRetry && (
      <button onClick={onRetry}
        className="mt-3 rounded-full border border-red-300/40 bg-red-500/20 px-4 py-1.5 text-xs font-medium text-red-200 transition-colors hover:bg-red-500/30">
        {retryLabel}
      </button>
    )}
  </div>
);
