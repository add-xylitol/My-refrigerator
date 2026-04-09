import type { VisionDebugInfo } from '../../services';

const jsonStringifyPretty = (value: unknown) =>
  JSON.stringify(value, null, 2).replace(/\\n/g, '\n').replace(/\\t/g, '\t');

type VisionDebugPanelProps = {
  debug: VisionDebugInfo;
  error: string | null;
};

export const VisionDebugPanel = ({ debug, error }: VisionDebugPanelProps) => {
  return (
    <details className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-inner backdrop-blur-xl" open={Boolean(error)}>
      <summary className="cursor-pointer select-none text-sm font-semibold text-accent-100 outline-none">
        调试信息（点击展开）
        {error ? (
          <span className="ml-2 rounded-full border border-red-400/60 bg-red-500/20 px-2 py-0.5 text-xs text-red-200">{error}</span>
        ) : (
          <span className="ml-2 text-xs text-slate-300/80">模型交互详情</span>
        )}
      </summary>
      <div className="mt-4 space-y-4 text-xs text-slate-200/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-48">
            <p className="font-semibold text-white">识别输入</p>
            <p className="mt-1 text-slate-300/70">当前上传的图片预览：</p>
          </div>
          <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-2">
            <img src={debug.imageDataUrl} alt="识别图片预览" className="max-h-60 w-full rounded-xl object-contain" />
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-48">
            <p className="font-semibold text-white">提示词 Prompt</p>
            <p className="mt-1 text-slate-300/70">传给模型的文字指令。</p>
          </div>
          <pre className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-left leading-relaxed text-accent-100/80">{debug.prompt}</pre>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-48">
            <p className="font-semibold text-white">请求 Payload</p>
            <p className="mt-1 text-slate-300/70">模型请求体（已隐藏 base64 图片）。</p>
          </div>
          <pre className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-left leading-relaxed text-emerald-100/80">{jsonStringifyPretty(debug.requestPayload)}</pre>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="sm:w-48">
            <p className="font-semibold text-white">模型返回 JSON</p>
            <p className="mt-1 text-slate-300/70">原始响应内容，便于排查格式问题。</p>
          </div>
          <pre className="flex-1 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 text-left leading-relaxed text-sky-100/90">{debug.responseText ?? '（暂无返回数据）'}</pre>
        </div>
      </div>
    </details>
  );
};
