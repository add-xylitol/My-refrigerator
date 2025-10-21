import { useFridgeStore } from '../../stores/fridgeStore';
import { FridgeGrid } from './FridgeGrid';

export const FridgeViewer = () => {
  const { shelves, selectedShelfId } = useFridgeStore((state) => ({
    shelves: state.shelves,
    selectedShelfId: state.selectedShelfId
  }));

  const selectedShelf =
    shelves.find((shelf) => shelf.id === selectedShelfId) ?? shelves[0] ?? null;

  return (
    <section className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-glass backdrop-blur-xl">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-200/80">层位选中</p>
          <h3 className="text-xl font-semibold text-white">
            {selectedShelf ? selectedShelf.name : '未选择'}
          </h3>
        </div>
        <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-accent-100/90">
          2D 视图
        </div>
      </header>
      <div className="mt-5">
        <FridgeGrid />
      </div>
    </section>
  );
};
