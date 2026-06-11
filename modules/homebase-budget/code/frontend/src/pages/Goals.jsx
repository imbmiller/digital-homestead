import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { goalsApi } from "../api";

function ProgressBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  const color = clamped >= 100 ? "#22c55e" : clamped >= 60 ? "#3b82f6" : "#f59e0b";
  return (
    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, backgroundColor: color }} />
    </div>
  );
}

function GoalCard({ goal, categories, onEdit, onDelete }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    goalsApi.progress(goal.id)
      .then((r) => setProgress(r.data))
      .catch(() => {});
  }, [goal.id]);

  const cat = categories.find((c) => c.id === goal.category_id);

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {goal.color && <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: goal.color }} />}
          <h3 className="text-sm font-semibold text-white truncate">{goal.name}</h3>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(goal)} className="text-gray-500 hover:text-gray-300 text-xs px-2 py-0.5 rounded hover:bg-gray-700">Edit</button>
          <button onClick={() => onDelete(goal.id)} className="text-gray-500 hover:text-red-400 text-xs px-2 py-0.5 rounded hover:bg-gray-700">×</button>
        </div>
      </div>

      {goal.budget > 0 && progress && (
        <>
          <div className="flex justify-between text-xs text-gray-400">
            <span>${progress.contributed.toFixed(0)} contributed</span>
            <span>Target: ${goal.budget.toFixed(0)}</span>
          </div>
          <ProgressBar pct={progress.percent} />
          <div className="flex justify-between text-xs">
            <span className={progress.percent >= 100 ? "text-green-400" : "text-gray-500"}>{progress.percent.toFixed(0)}% complete</span>
            {progress.remaining > 0 && <span className="text-gray-500">${progress.remaining.toFixed(0)} to go</span>}
          </div>
          {progress.projected_completion_date && progress.remaining > 0 && (
            <p className="text-xs text-gray-600">
              Projected completion: <span className={progress.on_track ? "text-green-400" : "text-amber-400"}>{progress.projected_completion_date}</span>
              {goal.end_date && <span className="text-gray-600"> (target: {goal.end_date})</span>}
            </p>
          )}
        </>
      )}

      {cat && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || "#6b7280" }} />
          <span>Tracking: {cat.name}</span>
        </div>
      )}

      {(goal.start_date || goal.end_date) && (
        <p className="text-xs text-gray-600">
          {goal.start_date && <span>Start: {goal.start_date}</span>}
          {goal.start_date && goal.end_date && " · "}
          {goal.end_date && <span>End: {goal.end_date}</span>}
        </p>
      )}
    </div>
  );
}

function GoalForm({ goal, categories, onSave, onCancel }) {
  const [name, setName] = useState(goal?.name || "");
  const [budget, setBudget] = useState(goal?.budget ? String(goal.budget) : "");
  const [color, setColor] = useState(goal?.color || "#3b82f6");
  const [startDate, setStartDate] = useState(goal?.start_date || "");
  const [endDate, setEndDate] = useState(goal?.end_date || "");
  const [categoryId, setCategoryId] = useState(goal?.category_id ? String(goal.category_id) : "");
  const [saving, setSaving] = useState(false);

  const nonSystemCats = categories.filter((c) => !c.is_system);
  const inp = "w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500";

  const save = async () => {
    if (!name) return;
    setSaving(true);
    try {
      const data = {
        name,
        budget: budget ? parseFloat(budget) : null,
        color,
        start_date: startDate || null,
        end_date: endDate || null,
        category_id: categoryId ? parseInt(categoryId) : null,
      };
      if (goal) {
        await goalsApi.update(goal.id, data);
      } else {
        await goalsApi.create(data);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white">{goal ? "Edit goal" : "New goal"}</h3>
      <div>
        <label className="text-xs text-gray-400">Goal name</label>
        <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-400">Target amount ($)</label>
          <input type="number" min="0" step="100" className={inp} value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="5000" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Color</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="bg-gray-800 border border-gray-700 rounded w-full h-9 px-1 cursor-pointer" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-400">Start date</label>
          <input type="date" className={inp} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400">Target date</label>
          <input type="date" className={inp} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400">Track contributions via category <span className="text-gray-600">(optional)</span></label>
        <select className={inp} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">None (manual)</option>
          {nonSystemCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={save} disabled={saving || !name} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm py-1.5 rounded">
          {saving ? "Saving…" : "Save goal"}
        </button>
        <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm py-1.5 rounded">Cancel</button>
      </div>
    </div>
  );
}

export default function Goals() {
  const { categories } = useAppStore();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);

  const load = () => {
    goalsApi.list()
      .then((r) => setGoals(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    await goalsApi.delete(id);
    load();
  };

  const handleEdit = (goal) => {
    setEditGoal(goal);
    setShowForm(false);
  };

  const afterSave = () => {
    setShowForm(false);
    setEditGoal(null);
    load();
  };

  const activeGoals = goals.filter((g) => g.is_active);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Savings Goals</h1>
          {!showForm && !editGoal && (
            <button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded">
              + New goal
            </button>
          )}
        </div>

        {showForm && (
          <GoalForm categories={categories} onSave={afterSave} onCancel={() => setShowForm(false)} />
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : activeGoals.length === 0 && !showForm ? (
          <div className="text-center py-16 text-gray-600">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-sm">No goals yet. Create one to start tracking your savings progress.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGoals.map((goal) =>
              editGoal?.id === goal.id ? (
                <GoalForm key={goal.id} goal={goal} categories={categories} onSave={afterSave} onCancel={() => setEditGoal(null)} />
              ) : (
                <GoalCard key={goal.id} goal={goal} categories={categories} onEdit={handleEdit} onDelete={handleDelete} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
