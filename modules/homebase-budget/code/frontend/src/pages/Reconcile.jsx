import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { useAppStore } from "../store";
import { transactionsApi } from "../api";

export default function Reconcile() {
  const { accounts, fetchAll } = useAppStore();
  const [accountId, setAccountId] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [statementDate, setStatementDate] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [cleared, setCleared] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const account = accounts.find((a) => String(a.id) === accountId);

  const load = async () => {
    if (!accountId) return;
    setLoading(true);
    setDone(false);
    try {
      const params = { account_id: accountId, sort_by: "date", sort_dir: "desc", limit: 2000 };
      if (statementDate) params.date_to = statementDate;
      const res = await transactionsApi.list(params);
      const txns = res.data.filter((t) => !t.is_transfer && !t.is_ignored);
      setTransactions(txns);
      setCleared(new Set(txns.filter((t) => t.is_cleared).map((t) => t.id)));
    } finally {
      setLoading(false);
    }
  };

  const toggleCleared = (id) => {
    setCleared((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearedBalance = transactions
    .filter((t) => cleared.has(t.id))
    .reduce((s, t) => s + t.amount, 0);

  const statBalance = parseFloat(statementBalance) || 0;
  const difference = Math.abs(clearedBalance - statBalance);
  const isBalanced = difference < 0.01;

  const finish = async () => {
    setSaving(true);
    try {
      const toMark = transactions.filter((t) => cleared.has(t.id) && !t.is_cleared);
      const toUnmark = transactions.filter((t) => !cleared.has(t.id) && t.is_cleared);
      await Promise.all([
        ...toMark.map((t) => transactionsApi.update(t.id, { is_cleared: true })),
        ...toUnmark.map((t) => transactionsApi.update(t.id, { is_cleared: false })),
      ]);
      setDone(true);
      fetchAll();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        <h1 className="text-lg font-semibold text-white">Reconcile Account</h1>

        {done && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-sm text-green-300">
            Reconciliation complete. All cleared transactions have been saved.
            <button onClick={() => setDone(false)} className="ml-3 underline text-green-400">Reconcile again</button>
          </div>
        )}

        {/* Setup */}
        <div className="grid md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Account</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Select account…</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Statement date</label>
            <input
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Statement ending balance</label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 1234.56"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <button
          onClick={load}
          disabled={!accountId || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-5 py-2 rounded"
        >
          {loading ? "Loading…" : "Load transactions"}
        </button>

        {transactions.length > 0 && (
          <>
            {/* Status bar */}
            <div className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${isBalanced ? "border-green-700 bg-green-900/20" : "border-gray-700 bg-gray-800/40"}`}>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Cleared balance</p>
                <p className="text-lg font-bold text-white font-mono">${clearedBalance.toFixed(2)}</p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-400">Statement balance</p>
                <p className="text-lg font-bold text-white font-mono">${statBalance.toFixed(2)}</p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-400">Difference</p>
                <p className={`text-lg font-bold font-mono ${isBalanced ? "text-green-400" : "text-amber-400"}`}>${difference.toFixed(2)}</p>
              </div>
              {isBalanced && statementBalance && (
                <button
                  onClick={finish}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded shrink-0"
                >
                  {saving ? "Saving…" : "Finish reconciliation"}
                </button>
              )}
            </div>

            <p className="text-xs text-gray-400">
              {cleared.size} of {transactions.length} transactions cleared · click to toggle
            </p>

            {/* Transaction list */}
            <div className="space-y-0.5">
              {transactions.map((t) => {
                const isCleared = cleared.has(t.id);
                return (
                  <div
                    key={t.id}
                    onClick={() => toggleCleared(t.id)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors ${isCleared ? "bg-green-900/20 border border-green-800/40" : "hover:bg-gray-800/50 border border-transparent"}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${isCleared ? "border-green-500 bg-green-500" : "border-gray-600"}`}>
                      {isCleared && <span className="text-white text-xs leading-none">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{t.description}</p>
                      <p className="text-xs text-gray-500">{format(parseISO(t.date), "MMM d, yyyy")}</p>
                    </div>
                    <span className={`text-sm font-mono shrink-0 ${t.amount > 0 ? "text-green-400" : "text-gray-300"}`}>
                      {t.amount > 0 ? "+" : "−"}${Math.abs(t.amount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
