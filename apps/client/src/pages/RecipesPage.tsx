import { FormEvent, useMemo, useState } from 'react';
import { useFridgeStore } from '../stores/fridgeStore';
import { aiService, type RecipeSuggestion } from '../services';
import { nanoid } from '../utils/nanoid';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: RecipeSuggestion[];
};

export const RecipesPage = () => {
  const { items, condiments, updateItem, removeItem } = useFridgeStore((state) => ({
    items: state.items,
    condiments: state.condiments,
    updateItem: state.updateItem,
    removeItem: state.removeItem
  }));

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickPrompts = aiService.quickPrompts;

  const pushMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleCook = (suggestion: RecipeSuggestion) => {
    suggestion.usage.forEach((usage) => {
      const item = itemsById.get(usage.itemId);
      if (!item) {
        return;
      }
      const remaining = Math.max(item.qty - usage.qty, 0);
      if (remaining <= 0) {
        removeItem(item.id);
      } else {
        updateItem(item.id, { qty: Number(remaining.toFixed(2)) });
      }
    });
  };

  const sendMessage = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      return;
    }

    pushMessage({ id: nanoid(), role: 'user', content: trimmed });
    setInput('');
    setIsLoading(true);

    try {
      const response = await aiService.chatRecipes({
        message: trimmed,
        items,
        condiments
      });

      pushMessage({
        id: nanoid(),
        role: 'assistant',
        content: response.reply,
        suggestions: response.suggestions
      });
    } catch (error) {
      pushMessage({
        id: nanoid(),
        role: 'assistant',
        content: '抱歉，暂时无法生成菜谱，请稍后再试。'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <header className="rounded-3xl border border-white/10 bg-white/10 p-5 shadow-glass backdrop-blur-xl">
        <p className="text-[11px] uppercase tracking-[0.35em] text-accent-200/80">AI 菜谱助手</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">和冰箱聊一道菜</h1>
        <p className="mt-1 text-sm text-slate-200/80">
          输入你的饮食偏好或点击快捷提示，我会基于当前库存与小料给出菜谱建议并可一键扣减。
        </p>
      </header>

      <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
        <p className="text-xs text-slate-200/80">试试这些问题</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void sendMessage(prompt)}
              className="rounded-full border border-white/10 bg-black/30 px-4 py-1.5 text-xs text-accent-100 transition-colors hover:border-accent-300/60"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-2">
          {messages.length === 0 && !isLoading && (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-6 py-12 text-center text-sm text-slate-200/70">
              这里会展示与菜谱助手的对话内容与推荐结果。
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl border px-4 py-3 text-sm shadow-glass backdrop-blur-xl ${
                  message.role === 'user'
                    ? 'border-brand-400/60 bg-gradient-to-r from-brand-500/60 to-accent-500/60 text-white'
                    : 'border-white/10 bg-white/10 text-slate-100'
                }`}
              >
                <p>{message.content}</p>
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {message.suggestions.map((recipe) => (
                      <article
                        key={recipe.id}
                        className="rounded-3xl border border-white/10 bg-black/30 p-4 text-xs text-slate-200/80"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.35em] text-accent-200/80">
                              {recipe.type}
                            </p>
                            <h2 className="mt-1 text-lg font-semibold text-white">{recipe.title}</h2>
                          </div>
                          <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] text-white/80">
                            {recipe.minutes} 分钟
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-200/80">{recipe.summary}</p>
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="text-xs font-medium text-white/80">食材用量</p>
                            <ul className="mt-1 space-y-1">
                              {recipe.usage.map((usage) => (
                                <li key={`${recipe.id}-${usage.itemId}`}>
                                  {usage.name} · {usage.qty}
                                  {usage.unit}
                                </li>
                              ))}
                            </ul>
                          </div>
                          {recipe.condiments.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-white/80">推荐小料</p>
                              <p>{recipe.condiments.join('、')}</p>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCook(recipe)}
                          className="mt-3 inline-flex items-center justify-center rounded-full border border-white/10 bg-gradient-to-r from-brand-500/80 to-accent-500/80 px-4 py-1.5 text-xs font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]"
                        >
                          开始烹饪并扣减库存
                        </button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[75%] animate-pulse rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200/70">
                助手正在思考菜谱…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="sticky bottom-0 flex items-center gap-2 rounded-3xl border border-white/10 bg-white/10 p-3 shadow-glass backdrop-blur-xl"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="告诉我想吃什么，例如：今晚想要低脂瘦身晚餐"
            className="flex-1 rounded-2xl border border-transparent bg-black/30 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-accent-300 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-full border border-brand-300/60 bg-gradient-to-r from-brand-500 to-accent-500 px-5 py-2 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-50"
          >
            发送
          </button>
        </form>
      </section>
    </div>
  );
};
