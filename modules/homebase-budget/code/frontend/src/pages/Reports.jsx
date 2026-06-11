import { useState, useEffect } from "react";
import { format, parseISO, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { useAppStore } from "../store";
import { reportsApi, assetsApi, transactionsApi } from "../api";

const TABS = ["Spending", "Trends", "Income vs Expense", "Recurring", "Cash Flow", "Net Worth"];

const FMT_CURRENCY = (v) => `$${Number(v).toFixed(0)}`;

function useReportDate() {
  const today = new Date();
  return {
    date_from: format(startOfMonth(today), "yyyy-MM-dd"),
    date_to: format(endOfMonth(today), "yyyy-MM-dd"),
  };
}

// ── Category drill-down panel ────────────────────────────────────────────────
function CategoryDrilldown({ category, dateFrom, dateTo, categories, onClose, onUpdated }) {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    if (!category) return;
    setLoading(true);
    transactionsApi.list({ date_from: dateFrom, date_to: dateTo, limit: 2000 })
      .then((r) => {
        setTxns(
          r.data.filter(
            (t) => String(t.category_id) === String(category.category_id) && !t.is_transfer && !t.is_ignored
          )
        );
      })
      .finally(() => setLoading(false));
  }, [category, dateFrom, dateTo]);

  const reassign = async (txnId, newCatId) => {
    setSaving((prev) => ({ ...prev, [txnId]: true }));
    try {
      await transactionsApi.update(txnId, { category_id: newCatId ? parseInt(newCatId) : null });
      setTxns((prev) => prev.filter((t) => t.id !== txnId));
      onUpdated();
    } finally {
      setSaving((prev) => ({ ...prev, [txnId]: false }));
    }
  };

  if (!category) return null;
  const nonSystemCats = categories.filter((c) => !c.is_system);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border-l border-gray-800 flex flex-col h-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 shrink-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: category.category_color || "#6b7280" }} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{category.category_name}</h3>
            <p className="text-xs text-gray-500">{txns.length} transactions · ${category.total_spent.toFixed(2)} spent</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none ml-2">×</button>
        </div>

        {/* Hint */}
        <p className="text-xs text-gray-600 px-4 pt-2 pb-1 shrink-0">Change the category dropdown to reassign a transaction.</p>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <p className="text-gray-500 text-sm p-4">Loading…</p>
          ) : txns.length === 0 ? (
            <p className="text-gray-500 text-sm p-4">No transactions found in this period.</p>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {txns.map((t) => (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{t.description}</p>
                    <p className="text-xs text-gray-500">{format(parseISO(t.date), "MMM d, yyyy")}</p>
                  </div>
                  <span className="text-sm font-mono shrink-0 text-gray-300">${Math.abs(t.amount).toFixed(2)}</span>
                  <select
                    value={t.category_id ?? ""}
                    onChange={(e) => reassign(t.id, e.target.value)}
                    disabled={saving[t.id]}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 max-w-[130px] disabled:opacity-50"
                  >
                    <option value="">Inbox</option>
                    {nonSystemCats.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Spending tab ────────────────────────────────────────────────────────────
function SpendingTab() {
  const { dateRange, categories } = useAppStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(dateRange.from);
  const [dateTo, setDateTo] = useState(dateRange.to);
  const [drillCategory, setDrillCategory] = useState(null);

  const load = (from, to) => {
    setLoading(true);
    reportsApi.spending(from, to)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(dateFrom, dateTo); }, []);

  const total = data.reduce((s, d) => s + d.total_spent, 0);

  const handleBarClick = (payload) => {
    if (payload && payload.activePayload && payload.activePayload[0]) {
      setDrillCategory(payload.activePayload[0].payload);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        <button onClick={() => load(dateFrom, dateTo)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded">Load</button>
      </div>
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-gray-500 text-sm">No spending data for this period.</p>
      ) : (
        <>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-3">Total spend: <span className="text-white font-semibold">${total.toFixed(2)}</span> · <span className="text-gray-600">click a bar or row to drill in</span></p>
            <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)}>
              <BarChart layout="vertical" data={data} margin={{ left: 16, right: 40, top: 0, bottom: 0 }} onClick={handleBarClick} style={{ cursor: "pointer" }}>
                <XAxis type="number" tickFormatter={FMT_CURRENCY} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="category_name" tick={{ fontSize: 11, fill: "#d1d5db" }} width={100} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, "Spent"]} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                <Bar dataKey="total_spent" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {data.map((d, i) => <Cell key={i} fill={d.category_color || "#3b82f6"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-gray-500 uppercase border-b border-gray-800">
                  <th className="text-left px-3 py-2">Category</th>
                  <th className="text-right px-3 py-2">Spent</th>
                  <th className="text-right px-3 py-2">Txns</th>
                  <th className="text-right px-3 py-2">% of total</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d, i) => (
                  <tr
                    key={i}
                    onClick={() => setDrillCategory(d)}
                    className="border-b border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.category_color || "#6b7280" }} />
                      <span className="text-gray-200">{d.category_name}</span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-200 font-mono">${d.total_spent.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{d.transaction_count}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{total > 0 ? ((d.total_spent / total) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {drillCategory && (
        <CategoryDrilldown
          category={drillCategory}
          dateFrom={dateFrom}
          dateTo={dateTo}
          categories={categories}
          onClose={() => setDrillCategory(null)}
          onUpdated={() => load(dateFrom, dateTo)}
        />
      )}
    </div>
  );
}

// ── Trends tab ─────────────────────────────────────────────────────────────
function TrendsTab() {
  const [months, setMonths] = useState(6);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = (m) => {
    setLoading(true);
    reportsApi.monthlyTrend(m)
      .then((r) => setRawData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(months); }, []);

  // Pivot: [{month, Cat1: x, Cat2: y, ...}]
  const allMonths = [...new Set(rawData.map((r) => r.month))].sort();
  const catIds = [...new Set(rawData.map((r) => r.category_id))];
  const catColors = {};
  const catNames = {};
  rawData.forEach((r) => { catNames[r.category_id] = r.category_id; });

  const pivoted = allMonths.map((mo) => {
    const row = { month: mo };
    for (const id of catIds) {
      const match = rawData.find((r) => r.month === mo && r.category_id === id);
      row[`cat_${id}`] = match ? match.total_spent : 0;
    }
    return row;
  });

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <label className="text-xs text-gray-400">Months:</label>
        {[3, 6, 12].map((m) => (
          <button key={m} onClick={() => { setMonths(m); load(m); }} className={`text-xs px-2.5 py-1 rounded border ${months === m ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>{m}mo</button>
        ))}
      </div>
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : pivoted.length === 0 ? (
        <p className="text-gray-500 text-sm">No data available.</p>
      ) : (
        <div className="bg-gray-800/50 rounded-xl p-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={pivoted} margin={{ left: 0, right: 8 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={FMT_CURRENCY} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name.replace("cat_", "Cat ")]} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
              {catIds.slice(0, 8).map((id, i) => (
                <Area key={id} type="monotone" dataKey={`cat_${id}`} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.3} />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ── Income vs Expense tab ──────────────────────────────────────────────────
function IncomeExpenseTab() {
  const { dateRange } = useAppStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(dateRange.from);
  const [dateTo, setDateTo] = useState(dateRange.to);

  const load = (from, to) => {
    setLoading(true);
    reportsApi.incomeExpense(from, to)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(dateFrom, dateTo); }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500" />
        <button onClick={() => load(dateFrom, dateTo)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded">Load</button>
      </div>
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : !data ? (
        <p className="text-gray-500 text-sm">No data.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Income", value: data.income, color: "text-green-400" },
              { label: "Expenses", value: data.expenses, color: "text-red-400" },
              { label: "Net", value: data.net, color: data.net >= 0 ? "text-green-400" : "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800/50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>${Math.abs(value).toFixed(0)}</p>
              </div>
            ))}
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[{ name: "This Period", income: data.income, expenses: data.expenses }]}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={FMT_CURRENCY} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`]} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

// ── Recurring tab ──────────────────────────────────────────────────────────
function RecurringTab() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.recurring()
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const FREQ_COLOR = { Weekly: "bg-blue-900/60 text-blue-300", Biweekly: "bg-purple-900/60 text-purple-300", Monthly: "bg-emerald-900/60 text-emerald-300" };

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-gray-500 text-sm">Analyzing transactions…</p>
      ) : data.length === 0 ? (
        <p className="text-gray-500 text-sm">No recurring patterns detected yet. Import more transaction history.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">{data.length} recurring transactions detected</p>
          {data.map((item, i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate capitalize">{item.original_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Next expected: {item.next_expected} · {item.transaction_count} occurrences</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-mono text-white">${item.median_amount.toFixed(2)}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${FREQ_COLOR[item.frequency] || "bg-gray-700 text-gray-300"}`}>{item.frequency}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Cash Flow tab ──────────────────────────────────────────────────────────
function CashFlowTab() {
  const [days, setDays] = useState(90);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = (d) => {
    setLoading(true);
    reportsApi.cashflow(d)
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(days); }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <label className="text-xs text-gray-400">Horizon:</label>
        {[30, 60, 90].map((d) => (
          <button key={d} onClick={() => { setDays(d); load(d); }} className={`text-xs px-2.5 py-1 rounded border ${days === d ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-600"}`}>{d}d</button>
        ))}
      </div>
      {loading ? (
        <p className="text-gray-500 text-sm">Projecting…</p>
      ) : !data || data.events.length === 0 ? (
        <p className="text-gray-500 text-sm">No recurring bills detected to project. Check the Recurring tab first.</p>
      ) : (
        <>
          <div className="bg-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-400 mb-2">Starting balance: <span className="text-white font-mono">${data.starting_balance.toFixed(2)}</span></p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.events} margin={{ left: 0, right: 8 }}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tickFormatter={FMT_CURRENCY} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`]} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
                <Area type="monotone" dataKey="running_balance" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} name="Balance" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-thin">
            {data.events.map((ev, i) => (
              <div key={i} className={`flex justify-between items-center px-3 py-1.5 rounded text-xs ${ev.running_balance < 0 ? "bg-red-950/30" : ""}`}>
                <span className="text-gray-400">{ev.date}</span>
                <span className="text-gray-200 flex-1 px-3 truncate">{ev.label}</span>
                <span className="text-red-400 font-mono mr-3">-${Math.abs(ev.amount).toFixed(2)}</span>
                <span className={`font-mono ${ev.running_balance < 0 ? "text-red-400" : "text-gray-300"}`}>${ev.running_balance.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Net Worth tab ──────────────────────────────────────────────────────────
function NetWorthTab() {
  const [data, setData] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAsset, setNewAsset] = useState({ name: "", value: "", asset_type: "other" });
  const [addingAsset, setAddingAsset] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([reportsApi.netWorth(), assetsApi.list()])
      .then(([nw, a]) => { setData(nw.data); setAssets(a.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const saveAsset = async () => {
    if (!newAsset.name || !newAsset.value) return;
    await assetsApi.create({ name: newAsset.name, value: parseFloat(newAsset.value), asset_type: newAsset.asset_type });
    setNewAsset({ name: "", value: "", asset_type: "other" });
    setAddingAsset(false);
    load();
  };

  const deleteAsset = async (id) => {
    await assetsApi.delete(id);
    load();
  };

  const ASSET_TYPES = ["real_estate", "vehicle", "investment", "cash", "other"];

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : !data ? null : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Assets", value: data.total_assets, color: "text-green-400" },
              { label: "Liabilities", value: data.total_liabilities, color: "text-red-400" },
              { label: "Net Worth", value: data.net_worth, color: data.net_worth >= 0 ? "text-blue-400" : "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-800/50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-xl font-bold ${color}`}>${Math.abs(value).toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* Trend sparkline */}
          {data.snapshots.length > 1 && (
            <div className="bg-gray-800/50 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2">Net Worth History</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={data.snapshots}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={FMT_CURRENCY} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`$${Number(v).toLocaleString()}`]} contentStyle={{ background: "#1f2937", border: "1px solid #374151", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Breakdown */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Assets</p>
              {[...data.account_assets, ...data.manual_assets].map((a, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800/50">
                  <span className="text-gray-300 capitalize">{a.name} <span className="text-gray-600 text-xs">({a.type})</span></span>
                  <span className="text-green-400 font-mono">${a.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Liabilities</p>
              {[...data.account_liabilities, ...data.debt_liabilities].map((a, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-800/50">
                  <span className="text-gray-300 capitalize">{a.name} <span className="text-gray-600 text-xs">({a.type})</span></span>
                  <span className="text-red-400 font-mono">${a.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Manual assets */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Manual Assets</p>
              <button onClick={() => setAddingAsset(true)} className="text-xs text-blue-400 hover:text-blue-300">+ Add asset</button>
            </div>
            {addingAsset && (
              <div className="flex gap-2 mb-3 flex-wrap">
                <input placeholder="Name" value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white flex-1 min-w-0 focus:outline-none focus:border-blue-500" />
                <input type="number" placeholder="Value" value={newAsset.value} onChange={(e) => setNewAsset({ ...newAsset, value: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white w-28 focus:outline-none focus:border-blue-500" />
                <select value={newAsset.asset_type} onChange={(e) => setNewAsset({ ...newAsset, asset_type: e.target.value })} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500">
                  {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={saveAsset} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded">Save</button>
                <button onClick={() => setAddingAsset(false)} className="text-gray-400 hover:text-white text-sm px-2 py-1.5">Cancel</button>
              </div>
            )}
            {assets.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-gray-800/50">
                <span className="text-sm text-gray-300">{a.name} <span className="text-gray-600 text-xs">({a.asset_type})</span></span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-green-400">${a.value.toLocaleString()}</span>
                  <button onClick={() => deleteAsset(a.id)} className="text-gray-600 hover:text-red-400 text-xs">×</button>
                </div>
              </div>
            ))}
            {assets.length === 0 && !addingAsset && <p className="text-xs text-gray-600">No manual assets added yet.</p>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Reports page ──────────────────────────────────────────────────────
export default function Reports() {
  const [activeTab, setActiveTab] = useState(0);

  const tabContent = [
    <SpendingTab key="spending" />,
    <TrendsTab key="trends" />,
    <IncomeExpenseTab key="ie" />,
    <RecurringTab key="recurring" />,
    <CashFlowTab key="cashflow" />,
    <NetWorthTab key="networth" />,
  ];

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <h1 className="text-lg font-semibold text-white">Reports</h1>

        {/* Tabs */}
        <div className="flex gap-1 flex-wrap border-b border-gray-800 pb-0">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`text-sm px-3 py-2 rounded-t transition-colors border-b-2 ${
                activeTab === i
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div>{tabContent[activeTab]}</div>
      </div>
    </div>
  );
}
