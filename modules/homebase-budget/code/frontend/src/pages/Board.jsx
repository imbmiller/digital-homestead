import { useEffect, useState } from "react";
import { useAppStore } from "../store";
import KanbanBoard from "../components/Board/KanbanBoard";
import DetailDrawer from "../components/TransactionDetail/DetailDrawer";
import Drawer from "../components/shared/Drawer";
import DateRangePicker from "../components/shared/DateRangePicker";
import { format, parseISO } from "date-fns";

function CategoryDrawer({ category, transactions, onCardClick, onClose }) {
  if (!category) return null;
  return (
    <Drawer open={!!category} onClose={onClose} title={category.name}>
      <div className="space-y-1.5">
        {transactions.length === 0 && (
          <p className="text-sm text-gray-500 py-8 text-center">No transactions</p>
        )}
        {transactions.map((t) => (
          <div
            key={t.id}
            onClick={() => { onClose(); onCardClick(t); }}
            className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2.5 cursor-pointer border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm text-gray-200 truncate">{t.description}</p>
              <p className="text-xs text-gray-500">{format(parseISO(t.date), "MMM d")}</p>
            </div>
            <span className={`text-sm font-mono shrink-0 ml-3 ${t.amount > 0 ? "text-green-400" : "text-gray-200"}`}>
              {t.amount > 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </Drawer>
  );
}

export default function Board() {
  const { fetchAll, dateRange, setDateRange, loading, getTransactionsByCategory } = useAppStore();
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [arrangeMode, setArrangeMode] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        {loading && <span className="text-xs text-gray-500 animate-pulse">Loading…</span>}
        <button
          onClick={() => setArrangeMode((v) => !v)}
          className={`ml-auto shrink-0 text-xs px-3 py-1.5 rounded border transition-colors ${
            arrangeMode
              ? "bg-blue-600 border-blue-500 text-white"
              : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600"
          }`}
        >
          {arrangeMode ? "Done" : "Arrange"}
        </button>
      </div>

      {arrangeMode && (
        <div className="px-4 py-1.5 bg-blue-950/40 border-b border-blue-900/40 text-xs text-blue-300">
          Drag tiles to reorder. Click ✎ on any tile to set its budget. Click "Done arranging" when finished.
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          onCardClick={setSelectedTxn}
          onCategoryClick={setSelectedCategory}
          arrangeMode={arrangeMode}
        />
      </div>

      <DetailDrawer
        txn={selectedTxn}
        onClose={() => setSelectedTxn(null)}
        onUpdated={() => { setSelectedTxn(null); fetchAll(); }}
      />

      <CategoryDrawer
        category={selectedCategory}
        transactions={selectedCategory ? getTransactionsByCategory(selectedCategory.id) : []}
        onCardClick={setSelectedTxn}
        onClose={() => setSelectedCategory(null)}
      />
    </div>
  );
}
