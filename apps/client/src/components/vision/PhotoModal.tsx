import { useRef } from 'react';

type PhotoModalProps = {
  open: boolean;
  onClose: () => void;
  onImageSelected: (file: File) => void;
};

export const PhotoModal = ({ open, onClose, onImageSelected }: PhotoModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-6 w-full max-w-sm rounded-3xl border border-white/10 bg-surface-800/95 p-6 shadow-glass backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}>
        <p className="text-center text-lg font-semibold text-white">拍照识别食材</p>
        <p className="mt-2 text-center text-sm text-slate-300/80">拍一张冰箱内部的照片，AI 自动识别食材</p>

        <div className="mt-6 flex flex-col gap-3">
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <button type="button" onClick={() => cameraInputRef.current?.click()}
            className="w-full rounded-2xl border border-brand-300/60 bg-brand-500/50 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-500/70">
            📷 拍照
          </button>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-sm text-white transition-colors hover:bg-white/10">
            🖼 从相册选择
          </button>

          <button type="button" onClick={onClose}
            className="mt-2 text-center text-xs text-slate-400 hover:text-white">
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
