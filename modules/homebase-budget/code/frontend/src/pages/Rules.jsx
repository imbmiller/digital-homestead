import { useEffect, useState } from "react";
import { rulesApi } from "../api";
import { useAppStore } from "../store";

const EMPTY_RULE = {
  name: "",
  priority: 100,
  cond_description_contains: "",
  cond_description_regex: "",
  cond_amount_min: "",
  cond_amount_max: "",
  cond_transaction_type: "",
  action_category_id: "",
  action_set_transfer: false,
  action_set_ignored: false,
  is_active: true,
};

const RUN_MODES = [
  { id: "uncategorized", label: "Uncategorized only", description: "Only transactions still in the Inbox." },
  { id: "all", label: "All transactions", description: "Re-applies to every transaction." },
  { id: "after_date", label: "After a specific date", description: "On or after the date you choose." },
];

function RuleForm({ initial, categories, onSave, onCancel, onRun }) {
  const [form, setForm] = useState({ ...EMPTY_RULE, ...initial });
  const [runPanelOpen, setRunPanelOpen] = useState(false);
  const [runMode, setRunMode] = useState("uncategorized");
  const [runDateFrom, setRunDateFrom] = useState("");
  const [running, setRunning] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    const cleaned = {
      ...form,
      cond_description_contains: form.cond_description_contains || null,
      cond_description_regex: form.cond_description_regex || null,
      cond_amount_min: form.cond_amount_min !== "" ? parseFloat(form.cond_amount_min) : null,
      cond_amount_max: form.cond_amount_max !== "" ? parseFloat(form.cond_amount_max) : null,
      cond_transaction_type: form.cond_transaction_type || null,
      action_category_id: form.action_category_id ? parseInt(form.action_category_id) : null,
      priority: parseInt(form.priority),
    };
    onSave(cleaned);
  };

  const nonSystemCats = categories.filter((c) => !c.is_system);
  const inp = "bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-full";

  return (
    <form onSubmit={submit} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Name</label>
          <input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400">Priority (lower = first)</label>
          <input type="number" className={inp} value={form.priority} onChange={(e) => set("priority", e.target.value)} />
        </div>
      </div>
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Conditions (all must match)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400">Description contains</label>
            <input className={inp} value={form.cond_description_contains} onChange={(e) => set("cond_description_contains", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400">Description regex</label>
            <input className={inp} value={form.cond_description_regex} onChange={(e) => set("cond_description_regex", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400">Min amount ($)</label>
            <input type="number" step="0.01" className={inp} value={form.cond_amount_min} onChange={(e) => set("cond_amount_min", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400">Max amount ($)</label>
            <input type="number" step="0.01" className={inp} value={form.cond_amount_max} onChange={(e) => set("cond_amount_max", e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400">Transaction type</label>
            <select className={inp} value={form.cond_transaction_type} onChange={(e) => set("cond_transaction_type", e.target.value)}>
              <option value="">Any</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs text-gray-500 mb-2 font-medium uppercase">Action</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400">Assign category</label>
            <select className={inp} value={form.action_category_id} onChange={(e) => set("action_category_id", e.target.value)}>
              <option value="">None</option>
              {nonSystemCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 justify-end">
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.action_set_transfer} onChange={(e) => set("action_set_transfer", e.target.checked)} />
              Mark as transfer
            </label>
            <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
              <input type="checkbox" checked={form.action_set_ignored} onChange={(e) => set("action_set_ignored", e.target.checked)} />
              Mark as ignored
            </label>
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-1 flex-wrap">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded">Save</button>
        {onRun && (
          <button
            type="button"
            onClick={() => setRunPanelOpen((v) => !v)}
            className={`text-sm px-4 py-1.5 rounded border transition-colors ${
              runPanelOpen
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
            }`}
          >
            Run on existing…
          </button>
        )}
        <button type="button" onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-1.5 rounded">Cancel</button>
      </div>

      {runPanelOpen && (
        <div className="border-t border-gray-700 pt-3 space-y-2">
          {RUN_MODES.map((m) => (
            <label
              key={m.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                runMode === m.id ? "border-blue-500 bg-blue-950/30" : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <input
                type="radio"
                name="run-mode"
                value={m.id}
                checked={runMode === m.id}
                onChange={() => setRunMode(m.id)}
                className="mt-0.5 accent-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-gray-200">{m.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                {m.id === "after_date" && runMode === "after_date" && (
                  <input
                    type="date"
                    value={runDateFrom}
                    onChange={(e) => setRunDateFrom(e.target.value)}
                    className="mt-2 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>
            </label>
          ))}
          <button
            type="button"
            disabled={running || (runMode === "after_date" && !runDateFrom)}
            onClick={async () => {
              setRunning(true);
              try { await onRun(runMode, runDateFrom || undefined); setRunPanelOpen(false); }
              finally { setRunning(false); }
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm py-1.5 rounded transition-colors"
          >
            {running ? "Running…" : "Run rule"}
          </button>
        </div>
      )}
    </form>
  );
}

const MODES = [
  {
    id: "uncategorized",
    label: "Uncategorized only",
    description: "Apply rules only to transactions still sitting in the Inbox. Already-categorized transactions are left untouched.",
  },
  {
    id: "all",
    label: "All transactions",
    description: "Re-apply rules to every transaction in the database. Existing categories will be overwritten.",
  },
  {
    id: "after_date",
    label: "After a specific date",
    description: "Apply rules to all transactions on or after the date you choose, regardless of whether they're already categorized.",
  },
];

function BulkApplyPanel({ onClose }) {
  const [mode, setMode] = useState("uncategorized");
  const [dateFrom, setDateFrom] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    if (mode === "after_date" && !dateFrom) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await rulesApi.bulkApply(mode, dateFrom || undefined);
      setResult(res.data);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Apply rules to existing transactions</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
      </div>

      <div className="space-y-2">
        {MODES.map((m) => (
          <label
            key={m.id}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              mode === m.id
                ? "border-blue-500 bg-blue-950/30"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <input
              type="radio"
              name="bulk-mode"
              value={m.id}
              checked={mode === m.id}
              onChange={() => setMode(m.id)}
              className="mt-0.5 accent-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-200">{m.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
              {m.id === "after_date" && mode === "after_date" && (
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="mt-2 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              )}
            </div>
          </label>
        ))}
      </div>

      {result && (
        <p className="text-sm text-green-400">
          Done — {result.updated} transaction{result.updated !== 1 ? "s" : ""} updated out of {result.total} checked.
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={run}
          disabled={running || (mode === "after_date" && !dateFrom)}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded transition-colors"
        >
          {running ? "Applying…" : "Apply rules"}
        </button>
        <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm px-4 py-1.5 rounded">
          Close
        </button>
      </div>
    </div>
  );
}

export default function Rules() {
  const { categories, fetchCategories } = useAppStore();
  const [rules, setRules] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [applyResult, setApplyResult] = useState(null);
  const [showBulkPanel, setShowBulkPanel] = useState(false);

  const load = async () => {
    const res = await rulesApi.list();
    setRules(res.data);
  };

  useEffect(() => {
    load();
    if (categories.length === 0) fetchCategories();
  }, []);

  const createRule = async (data) => {
    await rulesApi.create(data);
    setAdding(false);
    load();
  };

  const updateRule = async (id, data) => {
    await rulesApi.update(id, data);
    setEditing(null);
    load();
  };

  const deleteRule = async (id) => {
    if (!confirm("Delete this rule?")) return;
    await rulesApi.delete(id);
    load();
  };

  const testRule = async (id) => {
    setApplyResult(null);
    const res = await rulesApi.test(id);
    setTestResult({ id, ...res.data });
  };

  const applyRule = async (id, mode, dateFrom) => {
    setTestResult(null);
    const res = await rulesApi.apply(id, mode, dateFrom);
    setApplyResult({ id, ...res.data });
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Categorization Rules</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkPanel((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded border transition-colors ${
              showBulkPanel
                ? "bg-gray-700 border-gray-600 text-white"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600"
            }`}
          >
            Apply to existing…
          </button>
          <button onClick={() => setAdding(true)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded">
            + New rule
          </button>
        </div>
      </div>

      {showBulkPanel && <BulkApplyPanel onClose={() => setShowBulkPanel(false)} />}

      {adding && <RuleForm categories={categories} onSave={createRule} onCancel={() => setAdding(false)} />}

      {rules.length === 0 && !adding && (
        <p className="text-gray-500 text-sm text-center py-12">No rules yet. Rules auto-categorize transactions on import.</p>
      )}

      {rules.map((rule) => (
        <div key={rule.id}>
          {editing === rule.id ? (
            <RuleForm
              initial={rule}
              categories={categories}
              onSave={(data) => updateRule(rule.id, data)}
              onCancel={() => setEditing(null)}
              onRun={(mode, dateFrom) => applyRule(rule.id, mode, dateFrom)}
            />
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-start gap-4">
              <div className="text-xs text-gray-600 w-6 pt-0.5">#{rule.priority}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{rule.name || "Unnamed rule"}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {rule.cond_description_contains && (
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                      desc contains "{rule.cond_description_contains}"
                    </span>
                  )}
                  {rule.cond_description_regex && (
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
                      regex: {rule.cond_description_regex}
                    </span>
                  )}
                  {rule.cond_amount_min != null && (
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">&gt; ${rule.cond_amount_min}</span>
                  )}
                  {rule.cond_amount_max != null && (
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">&lt; ${rule.cond_amount_max}</span>
                  )}
                  {rule.cond_transaction_type && (
                    <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{rule.cond_transaction_type}</span>
                  )}
                </div>
                <p className="text-xs text-blue-400 mt-1">
                  →{" "}
                  {rule.action_set_transfer && "mark transfer"}
                  {rule.action_set_ignored && "mark ignored"}
                  {rule.action_category_id && categories.find((c) => c.id === rule.action_category_id)?.name}
                </p>
                {testResult?.id === rule.id && (
                  <p className="text-xs text-green-400 mt-1">Matches {testResult.count} transaction{testResult.count !== 1 ? "s" : ""}</p>
                )}
                {applyResult?.id === rule.id && (
                  <p className="text-xs text-blue-400 mt-1">Applied to {applyResult.applied} transaction{applyResult.applied !== 1 ? "s" : ""}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => testRule(rule.id)} className="text-xs text-gray-500 hover:text-gray-300">Test</button>
                <button onClick={() => setEditing(rule.id)} className="text-xs text-gray-500 hover:text-gray-300">Edit</button>
                <button onClick={() => deleteRule(rule.id)} className="text-xs text-red-600 hover:text-red-400">Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
    </div>
  );
}
