import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { format, parseISO } from "date-fns";

export default function TransactionCard({ txn, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: txn.id,
    data: { type: "transaction", txn },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const amount = Math.abs(txn.amount);
  const isCredit = txn.amount > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(txn)}
      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 cursor-pointer hover:border-gray-600 hover:bg-gray-750 transition-colors select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-gray-200 leading-snug line-clamp-2 flex-1 font-medium">
          {txn.description}
        </p>
        <span className={`text-xs font-semibold shrink-0 ${isCredit ? "text-green-400" : "text-gray-200"}`}>
          {isCredit ? "+" : ""}${amount.toFixed(0)}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {format(parseISO(txn.date), "MMM d")}
      </p>
    </div>
  );
}
