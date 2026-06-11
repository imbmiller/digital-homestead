import { useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { useAppStore } from "../store";
import { accountsApi, categoriesApi, authApi } from "../api";

const ACCOUNT_TYPES = ["checking", "savings", "credit_card"];
const inp = "bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-full";

function AccountsSection() {
  const { accounts, fetchAccounts } = useAppStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", type: "checking", institution: "", current_balance: "" });

  const create = async (e) => {
    e.preventDefault();
    await accountsApi.create({
      ...form,
      current_balance: form.current_balance !== "" ? parseFloat(form.current_balance) : null,
    });
    setAdding(false);
    setForm({ name: "", type: "checking", institution: "", current_balance: "" });
    fetchAccounts();
  };

  const remove = async (id) => {
    if (!confirm("Delete account? Transactions will remain.")) return;
    await accountsApi.delete(id);
    fetchAccounts();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-white">Accounts</h2>
        <button onClick={() => setAdding((v) => !v)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded">
          + Add
        </button>
      </div>

      {adding && (
        <form onSubmit={create} className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">Name</label>
              <input className={inp} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Type</label>
              <select className={inp} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400">Institution</label>
              <input className={inp} value={form.institution} onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Current Balance</label>
              <input type="number" step="0.01" className={inp} value={form.current_balance} onChange={(e) => setForm((f) => ({ ...f, current_balance: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="bg-gray-700 text-white text-sm px-4 py-1.5 rounded">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {accounts.map((a) => (
          <div key={a.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{a.name}</p>
              <p className="text-xs text-gray-500">{a.institution ?? a.type}</p>
            </div>
            <div className="flex items-center gap-4">
              {a.current_balance != null && (
                <span className={`text-sm font-mono ${a.current_balance >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${a.current_balance.toFixed(2)}
                </span>
              )}
              <button onClick={() => remove(a.id)} className="text-xs text-red-600 hover:text-red-400">Remove</button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && <p className="text-gray-600 text-sm">No accounts yet.</p>}
      </div>
    </section>
  );
}

function CategoriesSection() {
  const { categories, fetchCategories } = useAppStore();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6b7280");
  const [parentId, setParentId] = useState("");

  const create = async (e) => {
    e.preventDefault();
    await categoriesApi.create({ name, color, parent_id: parentId ? parseInt(parentId) : null });
    setAdding(false);
    setName("");
    setParentId("");
    fetchCategories();
  };

  const remove = async (id) => {
    if (!confirm("Delete category? Transactions will move to Inbox.")) return;
    await categoriesApi.delete(id);
    fetchCategories();
  };

  const userCats = categories.filter((c) => !c.is_system);
  const topLevelCats = userCats.filter((c) => !c.parent_id);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-white">Categories</h2>
        <button onClick={() => setAdding((v) => !v)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded">
          + Add
        </button>
      </div>

      {adding && (
        <form onSubmit={create} className="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-3 space-y-3">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-400">Name</label>
              <input className={inp} required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-400">Color</label>
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 rounded cursor-pointer bg-transparent border-0" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Group under <span className="text-gray-600">(optional — creates sub-category)</span></label>
            <select className={inp} value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">None (top-level)</option>
              {topLevelCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded">Save</button>
            <button type="button" onClick={() => setAdding(false)} className="bg-gray-700 text-white text-sm px-4 py-1.5 rounded">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-2">
        {userCats.map((c) => (
          <div key={c.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              {c.parent_id && <span className="text-gray-700 text-xs">↳</span>}
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color ?? "#6b7280" }} />
              <span className="text-sm text-gray-200">{c.name}</span>
            </div>
            <button onClick={() => remove(c.id)} className="text-xs text-red-700 hover:text-red-500">×</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function UsersSection() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const register = async (e) => {
    e.preventDefault();
    try {
      await authApi.register(username, password);
      setMsg("User created.");
      setUsername(""); setPassword("");
    } catch (err) {
      setMsg(err.response?.data?.detail ?? "Error");
    }
  };

  return (
    <section>
      <h2 className="font-semibold text-white mb-3">Add User (max 2)</h2>
      <form onSubmit={register} className="flex gap-3 items-end max-w-sm">
        <div className="flex-1">
          <label className="text-xs text-gray-400">Username</label>
          <input className={inp} value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="flex-1">
          <label className="text-xs text-gray-400">Password</label>
          <input type="password" className={inp} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded">Create</button>
      </form>
      {msg && <p className="text-sm text-gray-400 mt-2">{msg}</p>}
    </section>
  );
}

function PayPeriodSection() {
  const stored = localStorage.getItem("homebase_pay_anchor") || "2026-05-02";
  const [anchor, setAnchor] = useState(stored);
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem("homebase_pay_anchor", anchor);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const nextPayDate = () => {
    try {
      const a = parseISO(anchor);
      const today = new Date();
      const diffDays = Math.floor((today - a) / (1000 * 60 * 60 * 24));
      const periodsElapsed = Math.floor(diffDays / 14);
      const nextStart = addDays(a, (periodsElapsed + 1) * 14);
      return format(nextStart, "MMMM d, yyyy");
    } catch {
      return "—";
    }
  };

  return (
    <section>
      <h2 className="font-semibold text-white mb-1">Pay Period</h2>
      <p className="text-xs text-gray-500 mb-3">
        Enter your most recent pay date. HomeBase uses this to calculate biweekly pay periods.
      </p>
      <div className="flex items-end gap-3 max-w-xs">
        <div className="flex-1">
          <label className="text-xs text-gray-400">Most recent pay date</label>
          <input
            type="date"
            value={anchor}
            onChange={(e) => setAnchor(e.target.value)}
            className={inp}
          />
        </div>
        <button
          onClick={save}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded"
        >
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">Next pay date: <strong className="text-gray-300">{nextPayDate()}</strong></p>
    </section>
  );
}

export default function Settings() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-lg font-semibold text-white">Settings</h1>
      <AccountsSection />
      <CategoriesSection />
      <PayPeriodSection />
      <UsersSection />
    </div>
    </div>
  );
}
