import { useState, useEffect } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  useSensor, useSensors, closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext, rectSortingStrategy, arrayMove, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import InboxColumn from "./InboxColumn";
import EnvelopeCard from "./EnvelopeCard";
import TransactionCard from "./TransactionCard";
import { useAppStore } from "../../store";
import { categoriesApi, budgetsApi } from "../../api";

function SortableEnvelopeCard(props) {
  const { category } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `cat-${category.id}`,
    data: { type: "category" },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <EnvelopeCard {...props} arrangeMode />
    </div>
  );
}

export default function KanbanBoard({ onCardClick, onCategoryClick, arrangeMode }) {
  const [activeId, setActiveId] = useState(null);
  const [localCategories, setLocalCategories] = useState(null);
  const [rolloverMap, setRolloverMap] = useState({});
  const { categories, transactions, budgets, getInboxCategory, moveTransaction, fetchCategories, fetchBudgets, getCurrentMonth } = useAppStore();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const inbox = getInboxCategory();
  const boardCategories = localCategories ?? categories.filter((c) => !c.is_system);

  // Fetch rollover amounts for current month
  useEffect(() => {
    const month = getCurrentMonth();
    if (!month) return;
    budgetsApi.rollover(month)
      .then((res) => {
        const map = {};
        for (const r of res.data) map[r.category_id] = r.rollover_amount;
        setRolloverMap(map);
      })
      .catch(() => {});
  }, [budgets]);

  // Group non-system categories by parent_id
  const parentCats = boardCategories.filter((c) => !c.parent_id);
  const childrenOf = (parentId) => boardCategories.filter((c) => c.parent_id === parentId);
  const hasGroups = boardCategories.some((c) => c.parent_id);

  const handleDragStart = ({ active }) => {
    setActiveId(active.id);
    if (arrangeMode) setLocalCategories(categories.filter((c) => !c.is_system));
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    if (arrangeMode) {
      const oldIndex = boardCategories.findIndex((c) => `cat-${c.id}` === active.id);
      const newIndex = boardCategories.findIndex((c) => `cat-${c.id}` === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(boardCategories, oldIndex, newIndex);
      setLocalCategories(reordered);
      const payload = reordered.map((c, i) => ({ id: c.id, sort_order: i }));
      await categoriesApi.reorder(payload);
      await fetchCategories();
      setLocalCategories(null);
    } else {
      const txnId = active.id;
      const droppableId = over.id;
      const targetCategoryId = droppableId === "col-inbox"
        ? inbox?.id ?? null
        : parseInt(droppableId.replace("col-", ""), 10);
      if (targetCategoryId == null) return;
      const txn = transactions.find((t) => t.id === txnId);
      if (!txn || txn.category_id === targetCategoryId) return;
      await moveTransaction(txnId, targetCategoryId);
    }
  };

  const handleBudgetSave = async (categoryId, amount, rolloverCap) => {
    const month = getCurrentMonth();
    await budgetsApi.upsert({
      category_id: categoryId,
      month,
      allocated: amount,
      rollover_cap: rolloverCap,
    });
    await fetchBudgets(month);
  };

  const activeTxn = !arrangeMode && activeId ? transactions.find((t) => t.id === activeId) : null;
  const activeCat = arrangeMode && activeId ? boardCategories.find((c) => `cat-${c.id}` === activeId) : null;

  const inboxTxns = transactions.filter(
    (t) => !t.is_ignored && !t.is_transfer && (!t.category_id || t.category_id === inbox?.id)
  );

  const totalIncome = transactions
    .filter((t) => t.amount > 0 && !t.is_transfer && !t.is_ignored)
    .reduce((s, t) => s + t.amount, 0);
  const totalAllocated = budgets.reduce((s, b) => s + (b.allocated || 0), 0);
  const totalRollover = Object.values(rolloverMap).reduce((s, v) => s + v, 0);
  const totalSpent = boardCategories.reduce((sum, cat) =>
    sum + transactions
      .filter((t) => t.category_id === cat.id && t.amount < 0 && !t.is_ignored && !t.is_transfer)
      .reduce((s, t) => s + Math.abs(t.amount), 0), 0);
  const free = totalAllocated + totalRollover - totalSpent;

  const renderCard = (cat, extra = {}) => {
    const catTxns = transactions.filter(
      (t) => t.category_id === cat.id && !t.is_ignored && !t.is_transfer
    );
    const budget = budgets.find((b) => b.category_id === cat.id);
    const rolloverAmount = rolloverMap[cat.id] || 0;
    return (
      <EnvelopeCard
        key={cat.id}
        category={cat}
        transactions={catTxns}
        budget={budget}
        rolloverAmount={rolloverAmount}
        onClick={onCategoryClick}
        onBudgetSave={handleBudgetSave}
        {...extra}
      />
    );
  };

  const renderGrid = (cats, sortable = false) => (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
      {cats.map((cat) => {
        if (sortable) {
          const catTxns = transactions.filter((t) => t.category_id === cat.id && !t.is_ignored && !t.is_transfer);
          const budget = budgets.find((b) => b.category_id === cat.id);
          const rolloverAmount = rolloverMap[cat.id] || 0;
          return (
            <SortableEnvelopeCard
              key={cat.id}
              category={cat}
              transactions={catTxns}
              budget={budget}
              rolloverAmount={rolloverAmount}
              onClick={() => {}}
              onBudgetSave={handleBudgetSave}
            />
          );
        }
        return renderCard(cat);
      })}
    </div>
  );

  const renderGroupedGrid = () => {
    if (!hasGroups) return renderGrid(boardCategories);
    return (
      <div className="space-y-5">
        {parentCats.map((parent) => {
          const children = childrenOf(parent.id);
          const groupCats = [parent, ...children];
          const groupSpent = groupCats.reduce((sum, cat) =>
            sum + transactions.filter((t) => t.category_id === cat.id && t.amount < 0 && !t.is_ignored && !t.is_transfer).reduce((s, t) => s + Math.abs(t.amount), 0), 0);
          const groupBudget = groupCats.reduce((sum, cat) => {
            const b = budgets.find((b) => b.category_id === cat.id);
            return sum + (b?.allocated || 0) + (rolloverMap[cat.id] || 0);
          }, 0);
          return (
            <div key={parent.id}>
              {children.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: parent.color || "#6b7280" }} />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{parent.name}</span>
                  {groupBudget > 0 && (
                    <span className="text-xs text-gray-600 ml-1">${groupSpent.toFixed(0)} / ${groupBudget.toFixed(0)}</span>
                  )}
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
              )}
              {renderGrid(groupCats)}
            </div>
          );
        })}
        {/* Ungrouped categories (shouldn't have children but parent listed with children) */}
        {boardCategories.filter((c) => c.parent_id && !parentCats.find((p) => p.id === c.parent_id)).length > 0 && (
          renderGrid(boardCategories.filter((c) => c.parent_id && !parentCats.find((p) => p.id === c.parent_id)))
        )}
      </div>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full">
        {/* Summary bar */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-400 shrink-0">
          <span>Income: <strong className="text-green-400">${totalIncome.toFixed(0)}</strong></span>
          <span>Allocated: <strong className="text-white">${totalAllocated.toFixed(0)}</strong></span>
          {totalRollover > 0 && <span>Rollover: <strong className="text-emerald-400">+${totalRollover.toFixed(0)}</strong></span>}
          <span>Spent: <strong className="text-white">${totalSpent.toFixed(0)}</strong></span>
          <span>Free: <strong className={free < 0 ? "text-red-400" : "text-blue-400"}>${free.toFixed(0)}</strong></span>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Inbox */}
          <div className="h-44 md:h-auto md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-gray-800 flex flex-col overflow-hidden">
            {inbox && <InboxColumn transactions={inboxTxns} onCardClick={arrangeMode ? undefined : onCardClick} />}
          </div>

          {/* Category grid */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin min-h-0">
            {arrangeMode ? (
              <SortableContext
                items={boardCategories.map((c) => `cat-${c.id}`)}
                strategy={rectSortingStrategy}
              >
                {renderGrid(boardCategories, true)}
              </SortableContext>
            ) : (
              renderGroupedGrid()
            )}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeTxn && (
          <div className="rotate-2 shadow-2xl w-52">
            <TransactionCard txn={activeTxn} onClick={() => {}} />
          </div>
        )}
        {activeCat && (
          <div className="rotate-1 shadow-2xl opacity-80">
            <EnvelopeCard
              category={activeCat}
              transactions={[]}
              budget={budgets.find((b) => b.category_id === activeCat.id)}
              rolloverAmount={0}
              onClick={() => {}}
              onBudgetSave={() => {}}
              arrangeMode
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
