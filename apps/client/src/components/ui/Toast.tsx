export const Toast = ({ message, visible }: { message: string; visible: boolean }) => {
  if (!visible) return null;
  return (
    <div className="fixed left-4 right-4 top-4 z-[60] mx-auto max-w-md animate-slide-down">
      <div className="rounded-2xl border border-white/15 bg-brand-500/80 px-4 py-3 text-center text-sm font-medium text-white shadow-glass backdrop-blur-xl">
        {message}
      </div>
    </div>
  );
};
