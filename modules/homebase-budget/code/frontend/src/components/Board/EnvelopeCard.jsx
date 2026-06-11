import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import ProgressBar from "../shared/ProgressBar";

const FILL_COLORS = {
  green: "#22c55e",
  amber: "#f59e0b",
  red:   "#ef4444",
};

function getFillColor(pct, hasBudget) {
  if (!hasBudget) return null;
  if (pct >= 100) return FILL_COLORS.red;
  if (pct >= 80)  return FILL_COLORS.amber;
  return FILL_COLORS.green;
}

export default function EnvelopeCard({ category, transactions, budget, rolloverAmount = 0, onClick, onBudgetSave, arrangeMode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${category.id}`,
    disabled: arrangeMode,
  });

  const [editing, setEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [rolloverEnabled, setRolloverEnabled] = useState(false);
  const [rolloverCap, setRolloverCap] = useState("");
  const inputRef = useRef();

  const spent = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const allocated = (budget?.allocated ?? 0) + rolloverAmount;
  const hasBudget = allocated > 0;
  const pct = hasBudget ? Math.min((spent / allocated) * 100, 100) : 0;
  const fillColor = getFillColor(pct, hasBudget);

  const cardStyle = fillColor
    ? { background: `linear-gradient(to top, ${fillColor}2a ${pct}%, transparent ${pct}%)` }
    : {};

  useEffect(() => {
    if (editing) {
      setBudgetInput(budget?.allocated > 0 ? String(budget.allocated) : "");
      setRolloverEnabled(budget?.rollover_cap != null);
      setRolloverCap(budget?.rollover_cap != null ? String(budget.rollover_cap || "") : "");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing]);

  const startEdit = (e) => {
    e.stopPropagation();
    setEditing(true);
  };

  const saveBudget = (e) => {
    e?.stopPropagation();
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val >= 0) {
      const cap = rolloverEnabled ? (parseFloat(rolloverCap) || 0) : null;
      onBudgetSave(category.id, val, cap);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") saveBudget();
    if (e.key === "Escape") { e.stopPropagation(); setEditing(false); }
  };

  const borderClass = isOver && !arrangeMode
    ? "border-blue-400 shadow-blue-900/40 shadow-lg"
    : arrangeMode
    ? "border-gray-700 cursor-grab active:cursor-grabbing"
    : "border-gray-800 hover:border-gray-700";

  return (
    <div
      ref={setNodeRef}
      onClick={() => !editing && !arrangeMode && onClick(category)}
      style={cardStyle}
      className={`relative rounded-xl border p-3 transition-all ${borderClass} bg-gray-900/80 min-h-[90px] flex flex-col justify-between ${!arrangeMode ? "cursor-pointer" : ""}`}
    >
      {isOver && !arrangeMode && (
        <div className="absolute inset-0 rounded-xl border-2 border-blue-400 pointer-events-none" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {category.color && (
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
          )}
          <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide truncate">
            {category.name}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {transactions.length > 0 && (
            <span className="text-xs text-gray-500">{transactions.length}</span>
          )}
          {!arrangeMode && (
            <button onClick={startEdit} title="Set budget" className="text-gray-600 hover:text-gray-300 transition-colors ml-1 leading-none">
              ✎
            </button>
          )}
        </div>
      </div>

      {/* Rollover badge */}
      {rolloverAmount > 0 && (
        <div className="absolute top-2 right-8">
          <span className="text-xs text-emerald-400 font-mono">+${rolloverAmount.toFixed(0)}</span>
        </div>
      )}

      {/* Spend / Budget */}
      <div className="mt-2">
        {editing ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400">$</span>
              <input
                ref={inputRef}
                type="number"
                min="0"
                step="10"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={saveBudget}
                className="w-full bg-gray-700 border border-blue-500 rounded px-1.5 py-0.5 text-sm text-white focus:outline-none"
                placeholder="0"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rolloverEnabled}
                onChange={(e) => setRolloverEnabled(e.target.checked)}
                className="accent-emerald-500"
                onBlur={(e) => e.stopPropagation()}
              />
              Roll over unused
            </label>
            {rolloverEnabled && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">Cap $</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  placeholder="No cap"
                  value={rolloverCap}
                  onChange={(e) => setRolloverCap(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                />
              </div>
            )}
          </div>
        ) : hasBudget ? (
          <p className="text-sm font-bold leading-none">
            <span className={pct >= 100 ? "text-red-400" : pct >= 80 ? "text-amber-400" : "text-white"}>
              ${spent.toFixed(0)}
            </span>
            <span className="text-gray-600 font-normal text-xs"> / ${allocated.toFixed(0)}</span>
            {rolloverAmount > 0 && <span className="text-xs text-emerald-500 ml-1">(+${rolloverAmount.toFixed(0)} rollover)</span>}
          </p>
        ) : spent > 0 ? (
          <p className="text-sm font-bold text-white">${spent.toFixed(0)}</p>
        ) : (
          <p className="text-xs text-gray-600">Click ✎ to set budget</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-2">
        <ProgressBar spent={spent} allocated={allocated} />
      </div>
    </div>
  );
}
