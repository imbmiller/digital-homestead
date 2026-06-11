import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import Drawer from "../shared/Drawer";
import { useAppStore } from "../../store";
import { rulesApi, debtsApi, transactionsApi } from "../../api";

const BULK_MODES = [
  { id: "uncategorized", label: "Uncategorized only", description: "Only transactions still in the Inbox." },
  { id: "all", label: "All transactions", description: "Overwrite existing categories." },
  { id: "after_date", label: "After a specific date", description: "On or after the date you choose." },
];

function RuleCreator({ txn, categories, initialCategoryId, onDone }) {
  const cleanedDesc = txn.raw_description.replace(/^debit card withdrawal:\s*/i, "").trim();
  const descWords = cleanedDesc.split(/\s+/).slice(0, 3).join(" ");
  const [name, setName] = useState(descWords);
  const [descContains, setDescContains] = useState(descWords);
  const [actionType, setActionType] = useState(initialCategoryId ? "categorize" : "ignore");
  const [actionCatId, setActionCatId] = useState(initialCategoryId ?? txn.category_id ?? "");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [priority, setPriority] = useState(50);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [bulkMode, setBulkMode] = useState("uncategorized");
  const [dateFrom, setDateFrom] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState(null);

  const nonSystemCats = categories.filter((c) => !c.is_system);
  const inp = "w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500";

  const save = async () => {
    if (applyToExisting && bulkMode === "after_date" && !dateFrom) return;
    setSaving(true);
    try {
      await rulesApi.create({
        name,
        priority: parseInt(priority),
        cond_description_contains: descContains || null,
        cond_amount_min: amountMin !== "" ? parseFloat(amountMin) : null,
        cond_amount_max: amountMax !== "" ? parseFloat(amountMax) : null,
        action_set_ignored: actionType === "ignore",
        action_category_id: actionType === "categorize" && actionCatId ? parseInt(actionCatId) : null,
        is_active: true,
      });
      if (applyToExisting) {
        const res = await rulesApi.bulkApply(bulkMode, dateFrom || undefined);
        setSaveResult(res.data);
      } else {
        setSaveResult({});
      }
      setTimeout(onDone, 1200);
    } finally {
      setSaving(false);
    }
  };

  if (saveResult !== null) {
    return (
      <p className="text-xs text-green-400 py-2">
        Rule saved!{saveResult.updated != null ? ` Applied to ${saveResult.updated} of ${saveResult.total} transactions.` : ""}
      </p>
    );
  }

  return (
    <div className="space-y-2.5">
      <div>
        <label className="text-xs text-gray-500">Rule name</label>
        <input className={inp} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="text-xs text-gray-500">Description contains</label>
        <input className={inp} value={descContains} onChange={(e) => setDescContains(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500">Amount greater than ($)</label>
          <input type="number" step="0.01" min="0" placeholder="e.g. 10" className={inp} value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-500">Amount less than ($)</label>
          <input type="number" step="0.01" min="0" placeholder="e.g. 500" className={inp} value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-500">Action</label>
        <div className="flex gap-2 mt-1">
          <label className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs cursor-pointer transition-colors ${actionType === "ignore" ? "border-gray-500 bg-gray-700 text-white" : "border-gray-700 text-gray-500 hover:border-gray-600"}`}>
            <input type="radio" name="rule-action" className="sr-only" checked={actionType === "ignore"} onChange={() => setActionType("ignore")} />
            Mark as ignored
          </label>
          <label className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded border text-xs cursor-pointer transition-colors ${actionType === "categorize" ? "border-blue-500 bg-blue-950/40 text-blue-300" : "border-gray-700 text-gray-500 hover:border-gray-600"}`}>
            <input type="radio" name="rule-action" className="sr-only" checked={actionType === "categorize"} onChange={() => setActionType("categorize")} />
            Assign category
          </label>
        </div>
        {actionType === "categorize" && (
          <select className={`${inp} mt-2`} value={actionCatId} onChange={(e) => setActionCatId(e.target.value)}>
            <option value="">None</option>
            {nonSystemCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>
      <div>
        <label className="text-xs text-gray-500">Priority (lower runs first)</label>
        <input type="number" className={inp} value={priority} onChange={(e) => setPriority(e.target.value)} />
      </div>

      <div className="border-t border-gray-700 pt-2.5">
        <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
          <input type="checkbox" checked={applyToExisting} onChange={(e) => setApplyToExisting(e.target.checked)} className="accent-blue-500" />
          Also apply to existing transactions
        </label>
        {applyToExisting && (
          <div className="mt-2 space-y-1.5">
            {BULK_MODES.map((m) => (
              <label
                key={m.id}
                className={`flex items-start gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${bulkMode === m.id ? "border-blue-500 bg-blue-950/30" : "border-gray-700 hover:border-gray-600"}`}
              >
                <input type="radio" name="rule-bulk-mode" value={m.id} checked={bulkMode === m.id} onChange={() => setBulkMode(m.id)} className="mt-0.5 accent-blue-500" />
                <div>
                  <p className="text-xs font-medium text-gray-200">{m.label}</p>
                  <p className="text-xs text-gray-500">{m.description}</p>
                  {m.id === "after_date" && bulkMode === "after_date" && (
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1.5 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500" />
                  )}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button onClick={save} disabled={saving || (applyToExisting && bulkMode === "after_date" && !dateFrom)} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs py-1.5 rounded">
          {saving ? "Saving…" : "Save rule"}
        </button>
        <button onClick={onDone} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 rounded">Skip</button>
      </div>
    </div>
  );
}

function SplitEditor({ txn, categories, onDone }) {
  const total = Math.abs(txn.amount);
  const [splits, setSplits] = useState(
    txn.splits && txn.splits.length > 0
      ? txn.splits.map((s) => ({ category_id: s.category_id ?? "", amount: String(Math.abs(s.amount)), notes: s.notes || "" }))
      : [
          { category_id: "", amount: String(total.toFixed(2)), notes: "" },
          { category_id: "", amount: "", notes: "" },
        ]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const nonSystemCats = categories.filter((c) => !c.is_system);
  const inp = "bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500";

  const allocatedSum = splits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const remaining = parseFloat((total - allocatedSum).toFixed(2));

  const updateSplit = (i, field, val) => {
    setSplits((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const addRow = () => setSplits((prev) => [...prev, { category_id: "", amount: "", notes: "" }]);
  const removeRow = (i) => setSplits((prev) => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    const rows = splits.filter((s) => parseFloat(s.amount) > 0);
    const sum = rows.reduce((s, r) => s + parseFloat(r.amount), 0);
    if (Math.abs(sum - total) > 0.01) {
      setError(`Split total $${sum.toFixed(2)} must equal transaction total $${total.toFixed(2)}`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await transactionsApi.updateSplits(txn.id, rows.map((r) => ({
        category_id: r.category_id ? parseInt(r.category_id) : null,
        amount: txn.amount < 0 ? -parseFloat(r.amount) : parseFloat(r.amount),
        notes: r.notes || null,
      })));
      onDone();
    } catch (e) {
      setError(e.response?.data?.detail ?? "Failed to save splits");
    } finally {
      setSaving(false);
    }
  };

  const clearSplits = async () => {
    setSaving(true);
    try {
      await transactionsApi.updateSplits(txn.id, []);
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">Total: <span className="text-white font-mono">${total.toFixed(2)}</span></p>
        <p className={`text-xs font-mono ${Math.abs(remaining) < 0.01 ? "text-green-400" : "text-amber-400"}`}>
          {Math.abs(remaining) < 0.01 ? "Balanced" : `${remaining > 0 ? "Remaining" : "Over"}: $${Math.abs(remaining).toFixed(2)}`}
        </p>
      </div>
      {splits.map((s, i) => (
        <div key={i} className="flex gap-2 items-start">
          <select value={s.category_id} onChange={(e) => updateSplit(i, "category_id", e.target.value)} className={`${inp} flex-1`}>
            <option value="">Category…</option>
            {nonSystemCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="number" step="0.01" min="0" placeholder="0.00" value={s.amount} onChange={(e) => updateSplit(i, "amount", e.target.value)} className={`${inp} w-24`} />
          {splits.length > 2 && (
            <button onClick={() => removeRow(i)} className="text-gray-600 hover:text-red-400 text-lg leading-none">×</button>
          )}
        </div>
      ))}
      <button onClick={addRow} className="text-xs text-blue-400 hover:text-blue-300">+ Add split</button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={save} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs py-1.5 rounded">
          {saving ? "Saving…" : "Save splits"}
        </button>
        <button onClick={clearSplits} disabled={saving} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white">
          Clear splits
        </button>
        <button onClick={onDone} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-400 hover:text-white">Cancel</button>
      </div>
    </div>
  );
}

export default function DetailDrawer({ txn, onClose, onUpdated }) {
  const { categories, updateTransaction } = useAppStore();
  const [notes, setNotes] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [debtAccountId, setDebtAccountId] = useState("");
  const [saving, setSaving] = useState(false);
  const [debts, setDebts] = useState([]);
  const [rulePrompt, setRulePrompt] = useState(false);
  const [savedCategoryId, setSavedCategoryId] = useState(null);
  const [creatingRule, setCreatingRule] = useState(false);
  const [splittingTxn, setSplittingTxn] = useState(false);

  useEffect(() => {
    debtsApi.list().then((r) => setDebts(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (txn) {
      setNotes(txn.notes || "");
      setCategoryId(txn.category_id ?? "");
      setDebtAccountId(txn.debt_account_id ?? "");
      setRulePrompt(false);
      setSavedCategoryId(null);
      setCreatingRule(false);
      setSplittingTxn(false);
    }
  }, [txn]);

  if (!txn) return null;

  const nonSystemCats = categories.filter((c) => !c.is_system);

  const closeAll = () => {
    onUpdated?.();
    onClose();
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateTransaction(txn.id, {
        notes,
        category_id: categoryId || null,
        debt_account_id: debtAccountId ? parseInt(debtAccountId) : null,
        is_reviewed: true,
      });
      setSavedCategoryId(categoryId || null);
      setRulePrompt(true);
    } finally {
      setSaving(false);
    }
  };

  const toggleTransfer = async () => {
    await updateTransaction(txn.id, { is_transfer: !txn.is_transfer });
    closeAll();
  };

  const toggleIgnore = async () => {
    await updateTransaction(txn.id, { is_ignored: !txn.is_ignored });
    closeAll();
  };

  const isCredit = txn.amount > 0;
  const savedCatName = savedCategoryId ? categories.find((c) => c.id === savedCategoryId)?.name : null;
  const hasSplits = txn.splits && txn.splits.length > 0;

  return (
    <Drawer open={!!txn} onClose={rulePrompt || splittingTxn ? undefined : onClose} title={rulePrompt ? "Transaction saved" : splittingTxn ? "Split transaction" : "Transaction"}>
      {splittingTxn ? (
        <SplitEditor txn={txn} categories={categories} onDone={() => { setSplittingTxn(false); closeAll(); }} />
      ) : rulePrompt ? (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-xl px-4 py-3">
            <p className="text-sm text-gray-200 font-medium">{txn.description}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {format(parseISO(txn.date), "MMM d, yyyy")}
              {savedCatName && <> · <span className="text-blue-400">{savedCatName}</span></>}
            </p>
          </div>

          {creatingRule ? (
            <>
              <p className="text-xs text-gray-400">Adjust the rule details below and save.</p>
              <RuleCreator txn={txn} categories={categories} initialCategoryId={savedCategoryId} onDone={closeAll} />
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-white font-medium">Create a rule for transactions like this?</p>
                <p className="text-xs text-gray-500 mt-1">
                  Future imports with a similar description will be {savedCatName ? `categorized as ${savedCatName}` : "auto-processed"} automatically.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCreatingRule(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded transition-colors">
                  Yes, create rule
                </button>
                <button onClick={closeAll} className="flex-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-sm py-2 rounded transition-colors">
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Amount + description */}
          <div>
            <p className={`text-2xl font-bold ${isCredit ? "text-green-400" : "text-white"}`}>
              {isCredit ? "+" : "-"}${Math.abs(txn.amount).toFixed(2)}
            </p>
            <p className="text-sm text-gray-300 mt-1">{txn.description}</p>
            {txn.raw_description !== txn.description && (
              <p className="text-xs text-gray-600 mt-0.5">Raw: {txn.raw_description}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">{format(parseISO(txn.date), "EEEE, MMMM d, yyyy")}</p>
          </div>

          {/* Splits indicator */}
          {hasSplits && (
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg px-3 py-2">
              <p className="text-xs text-blue-300">{txn.splits.length} splits active</p>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Category</label>
            <select
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Inbox (uncategorized)</option>
              {nonSystemCats.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Debt attribution */}
          {debts.length > 0 && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Payment toward debt <span className="text-gray-600">optional</span></label>
              <select
                value={debtAccountId}
                onChange={(e) => setDebtAccountId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">None</option>
                {debts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Flags */}
          <div className="flex gap-2">
            <button
              onClick={toggleTransfer}
              className={`flex-1 text-xs py-1.5 rounded border transition-colors ${txn.is_transfer ? "bg-blue-900 border-blue-600 text-blue-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}
            >
              {txn.is_transfer ? "Transfer ✓" : "Mark transfer"}
            </button>
            <button
              onClick={toggleIgnore}
              className={`flex-1 text-xs py-1.5 rounded border transition-colors ${txn.is_ignored ? "bg-gray-700 border-gray-600 text-gray-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}
            >
              {txn.is_ignored ? "Ignored ✓" : "Ignore"}
            </button>
            <button
              onClick={() => setSplittingTxn(true)}
              className="flex-1 text-xs py-1.5 rounded border border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 transition-colors"
            >
              {hasSplits ? "Edit splits" : "Split"}
            </button>
          </div>

          <button onClick={save} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded transition-colors">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </Drawer>
  );
}
