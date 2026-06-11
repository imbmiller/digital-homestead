import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { useAppStore } from "../store";
import { transactionsApi, categoriesApi } from "../api";
import DetailDrawer from "../components/TransactionDetail/DetailDrawer";
import DateRangePicker from "../components/shared/DateRangePicker";

const SORT_COLS = [
  { key: "date", label: "Date" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount" },
];

function SortIcon({ active, dir }) {
  if (!active) return <span className="text-gray-700 ml-0.5">↕</span>;
  return <span className="text-blue-400 ml-0.5">{dir === "asc" ? "↑" : "↓"}</span>;
}

export default function Transactions() {
  const { transactions, categories, accounts, dateRange, setDateRange, fetchAll, fetchTransactions } = useAppStore();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [hideIgnored, setHideIgnored] = useState(true);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchAll();
  }, []);

  // Re-fetch when sort changes
  const handleSort = (col) => {
    const newDir = sortBy === col && sortDir === "desc" ? "asc" : "desc";
    setSortBy(col);
    setSortDir(newDir);
    fetchTransactions(undefined, col, newDir, filterAccount || undefined);
  };

  const handleAccountFilter = (val) => {
    setFilterAccount(val);
    fetchTransactions(undefined, sortBy, sortDir, val || undefined);
  };

  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
  const acctMap = Object.fromEntries(accounts.map((a) => [a.id, a]));

  const filtered = transactions.filter((t) => {
    if (hideIgnored && t.is_ignored) return false;
    if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && String(t.category_id) !== filterCat) return false;
    return true;
  });

  const CategoryBadge = ({ categoryId }) => {
    const cat = catMap[categoryId];
    if (!cat) return <span className="text-xs text-amber-500">Inbox</span>;
    return (
      <span
        className="text-xs px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: (cat.color ?? "#374151") + "33",
          color: cat.color ?? "#9ca3af",
        }}
      >
        {cat.name}
      </span>
    );
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((t) => t.id)));
    }
  };

  const bulkAction = async (action) => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selected);
      if (action === "ignore") {
        await transactionsApi.bulkUpdate(ids, { is_ignored: true });
      } else if (action === "transfer") {
        await transactionsApi.bulkUpdate(ids, { is_transfer: true });
      } else if (action.startsWith("cat:")) {
        const catId = parseInt(action.slice(4));
        await transactionsApi.bulkUpdate(ids, { category_id: catId });
      }
      setSelected(new Set());
      fetchTransactions(undefined, sortBy, sortDir, filterAccount || undefined);
    } finally {
      setBulkLoading(false);
    }
  };

  const nonSystemCats = categories.filter((c) => !c.is_system);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 shrink-0 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => setHideIgnored((v) => !v)}
              className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                hideIgnored
                  ? "bg-gray-800 border-gray-700 text-gray-400"
                  : "bg-gray-700 border-gray-600 text-white"
              }`}
            >
              {hideIgnored ? "Show ignored" : "Hide ignored"}
            </button>
            <span className="text-xs text-gray-500">{filtered.length} transactions</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {accounts.length > 1 && (
            <select
              value={filterAccount}
              onChange={(e) => handleAccountFilter(e.target.value)}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All accounts</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-950/60 border-b border-blue-800/50 shrink-0 flex-wrap">
          <span className="text-xs text-blue-300 font-medium">{selected.size} selected</span>
          <select
            onChange={(e) => { if (e.target.value) bulkAction(e.target.value); e.target.value = ""; }}
            disabled={bulkLoading}
            className="bg-blue-900 border border-blue-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
            defaultValue=""
          >
            <option value="" disabled>Categorize as…</option>
            {nonSystemCats.map((c) => (
              <option key={c.id} value={`cat:${c.id}`}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => bulkAction("ignore")}
            disabled={bulkLoading}
            className="text-xs px-2.5 py-1 rounded border border-blue-700 bg-blue-900 text-blue-200 hover:bg-blue-800 disabled:opacity-50"
          >
            Ignore
          </button>
          <button
            onClick={() => bulkAction("transfer")}
            disabled={bulkLoading}
            className="text-xs px-2.5 py-1 rounded border border-blue-700 bg-blue-900 text-blue-200 hover:bg-blue-800 disabled:opacity-50"
          >
            Transfer
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-gray-400 hover:text-white"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Mobile: card list */}
        <div className="md:hidden divide-y divide-gray-800/60">
          {filtered.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTxn(t)}
              className={`flex items-center gap-3 px-4 py-3 active:bg-gray-800/50 cursor-pointer ${selected.has(t.id) ? "bg-blue-950/30" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected.has(t.id)}
                onClick={(e) => { e.stopPropagation(); toggleSelect(t.id); }}
                onChange={() => {}}
                className="accent-blue-500 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-200 truncate">
                  {t.description}
                  {t.is_transfer && <span className="ml-1 text-xs text-blue-500">[transfer]</span>}
                  {t.is_ignored && <span className="ml-1 text-xs text-gray-600">[ignored]</span>}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{format(parseISO(t.date), "MMM d")}</span>
                  <CategoryBadge categoryId={t.category_id} />
                </div>
              </div>
              <span className={`text-sm font-mono shrink-0 ${t.amount > 0 ? "text-green-400" : "text-gray-300"}`}>
                {t.amount > 0 ? "+" : "−"}${Math.abs(t.amount).toFixed(2)}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-600 text-sm">No transactions found</div>
          )}
        </div>

        {/* Desktop: table */}
        <table className="hidden md:table w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-gray-900 border-b border-gray-800 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 w-8">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={selectAll}
                  className="accent-blue-500"
                />
              </th>
              {SORT_COLS.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={`text-left px-4 py-2 cursor-pointer select-none hover:text-gray-300 ${col.key === "amount" ? "text-right w-28" : col.key === "date" ? "w-24" : ""}`}
                >
                  {col.label}<SortIcon active={sortBy === col.key} dir={sortDir} />
                </th>
              ))}
              <th className="text-left px-4 py-2">Account</th>
              <th className="text-left px-4 py-2">Category</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr
                key={t.id}
                onClick={() => setSelectedTxn(t)}
                className={`border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors ${selected.has(t.id) ? "bg-blue-950/20" : ""}`}
              >
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    className="accent-blue-500"
                  />
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                  {format(parseISO(t.date), "MMM d")}
                </td>
                <td className="px-4 py-2.5 text-gray-200 max-w-xs truncate">
                  {t.description}
                  {t.is_transfer && <span className="ml-1 text-xs text-blue-500">[transfer]</span>}
                  {t.is_ignored && <span className="ml-1 text-xs text-gray-600">[ignored]</span>}
                </td>
                <td className={`px-4 py-2.5 text-right font-mono text-sm ${t.amount > 0 ? "text-green-400" : "text-gray-200"}`}>
                  {t.amount > 0 ? "+" : ""}${Math.abs(t.amount).toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">
                  {acctMap[t.account_id]?.name ?? "—"}
                </td>
                <td className="px-4 py-2.5">
                  <CategoryBadge categoryId={t.category_id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="hidden md:block text-center py-16 text-gray-600 text-sm">No transactions found</div>
        )}
      </div>

      <DetailDrawer
        txn={selectedTxn}
        onClose={() => setSelectedTxn(null)}
        onUpdated={() => {
          setSelectedTxn(null);
          fetchTransactions(undefined, sortBy, sortDir, filterAccount || undefined);
        }}
      />
    </div>
  );
}
