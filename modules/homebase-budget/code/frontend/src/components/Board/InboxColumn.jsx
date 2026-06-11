import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TransactionCard from "./TransactionCard";

export default function InboxColumn({ transactions, onCardClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: "col-inbox" });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-full h-full rounded-xl border transition-colors ${
        isOver ? "border-amber-500 bg-amber-950/20" : "border-amber-900/50 bg-gray-900/60"
      }`}
    >
      <div className="px-3 pt-3 pb-2 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-amber-400">INBOX</h3>
          <span className="text-xs bg-amber-600 text-white rounded-full px-1.5 py-0.5 font-medium">
            {transactions.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">Uncategorized</p>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 scrollbar-thin min-h-[40px]">
        <SortableContext items={transactions.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {transactions.map((txn) => (
            <TransactionCard key={txn.id} txn={txn} onClick={onCardClick} />
          ))}
        </SortableContext>
        {transactions.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">All clear!</p>
        )}
      </div>
    </div>
  );
}
