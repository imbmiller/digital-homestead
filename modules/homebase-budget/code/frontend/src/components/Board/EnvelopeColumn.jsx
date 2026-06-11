import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TransactionCard from "./TransactionCard";
import ProgressBar from "../shared/ProgressBar";

const MAX_VISIBLE = 8;

export default function EnvelopeColumn({ category, transactions, budget, onCardClick }) {
  const [expanded, setExpanded] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: `col-${category.id}` });

  const spent = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const allocated = budget?.allocated ?? 0;
  const visible = expanded ? transactions : transactions.slice(0, MAX_VISIBLE);
  const hidden = Math.max(0, transactions.length - MAX_VISIBLE);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-52 shrink-0 rounded-xl border transition-colors ${
        isOver ? "border-blue-500 bg-blue-950/20" : "border-gray-800 bg-gray-900/60"
      }`}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-gray-300 truncate">{category.name.toUpperCase()}</h3>
          <span className="text-xs text-gray-500 shrink-0 ml-1">{transactions.length}</span>
        </div>
        {allocated > 0 ? (
          <p className="text-xs text-gray-400 mb-1.5">
            <span className={spent > allocated ? "text-red-400" : "text-gray-300"}>
              ${spent.toFixed(0)}
            </span>
            /{allocated.toFixed(0)}
          </p>
        ) : (
          <p className="text-xs text-gray-600 mb-1.5">No budget set</p>
        )}
        <ProgressBar spent={spent} allocated={allocated} />
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1.5 scrollbar-thin min-h-[40px]">
        <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {visible.map((txn) => (
            <TransactionCard key={txn.id} txn={txn} onClick={onCardClick} />
          ))}
        </SortableContext>
        {!expanded && hidden > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 text-center"
          >
            +{hidden} more
          </button>
        )}
        {expanded && hidden > 0 && (
          <button
            onClick={() => setExpanded(false)}
            className="w-full text-xs text-gray-500 hover:text-gray-300 py-1 text-center"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}
