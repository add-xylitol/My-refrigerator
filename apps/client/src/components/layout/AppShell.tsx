import { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/recipes', label: '菜谱', icon: '🍳' },
  { path: '/condiments', label: '小料', icon: '🌶️' },
  { path: '/settings', label: '设置', icon: '⚙️' }
];

export const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();

  return (
    <div className="relative flex min-h-screen flex-col text-slate-100">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-br from-brand-500/35 via-transparent to-accent-500/20 blur-3xl" />
      <header className="sticky top-0 z-40 px-4 pt-3">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-3xl border border-white/5 bg-white/10 px-4 py-3 backdrop-blur-2xl shadow-glass">
          <Link to="/" className="text-base font-semibold tracking-wide text-white">
            我的智能冰箱
          </Link>
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.25em] text-accent-200">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-glow" />
            Online
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 pb-28 pt-4 sm:pb-10">
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-around rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-2xl shadow-glass">
          {navItems.map((item) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={[
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-1 text-xs font-medium transition-all',
                  isActive
                    ? 'scale-105 text-white drop-shadow-[0_5px_18px_rgba(192,38,211,0.45)]'
                    : 'text-slate-300 hover:text-accent-200'
                ].join(' ')}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
