import { useEffect, useState } from "react";
import { debtsApi } from "../api";

const DEBT_TYPES = [
  { value: "credit_card", label: "Credit Card" },
  { value: "auto", label: "Auto Loan" },
  { value: "mortgage", label: "Mortgage" },
  { value: "student", label: "Student Loan" },
  { value: "personal", label: "Personal Loan" },
];

const EMPTY_FORM = {
  name: "",
  type: "credit_card",
  balance: "",
  interest_rate: "",
  minimum_payment: "",
  credit_limit: "",
  notes: "",
};

// ── Payoff math ──────────────────────────────────────────────────────────────

function calcPayoff(balance, aprPct, monthlyPayment) {
  if (monthlyPayment <= 0 || balance <= 0) return null;
  const monthlyRate = aprPct / 100 / 12;
  let b = balance;
  let totalInterest = 0;
  let months = 0;
  const MAX_MONTHS = 600; // 50 years guard
  while (b > 0 && months < MAX_MONTHS) {
    const interest = b * monthlyRate;
    totalInterest += interest;
    b = b + interest - monthlyPayment;
    months++;
    if (b < 0) b = 0;
  }
  if (months >= MAX_MONTHS) return null; // payment too low to pay off
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);
  return { months, totalInterest, payoffDate };
}

function calcMinOnlyInterest(balance, aprPct, minPayment) {
  const result = calcPayoff(balance, aprPct, minPayment);
  return result ? result.totalInterest : null;
}

function fmtCurrency(n) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d) {
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Payoff Modeler ────────────────────────────────────────────────────────────

function PayoffModeler({ debt }) {
  const [payment, setPayment] = useState(String(debt.minimum_payment));
  const parsed = parseFloat(payment);
  const minResult = calcPayoff(debt.balance, debt.interest_rate, debt.minimum_payment);
  const result = calcPayoff(debt.balance, debt.interest_rate, parsed || debt.minimum_payment);
  const minInterest = minResult ? minResult.totalInterest : null;
  const interestSaved = minInterest != null && result ? minInterest - result.totalInterest : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mt-3 space-y-3">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Payoff Modeler</p>
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-500 shrink-0">Monthly payment</label>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
          <input
            type="number"
            step="10"
            min={debt.minimum_payment}
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded pl-5 pr-2 py-1 text-sm text-white w-28 focus:outline-none focus:border-blue-500"
          />
        </div>
        {parsed < debt.minimum_payment && (
          <span className="text-xs text-amber-400">Below minimum ({fmtCurrency(debt.minimum_payment)})</span>
        )}
      </div>

      {result ? (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Payoff date" value={fmtDate(result.payoffDate)} sub={`${result.months} months`} />
          <Stat label="Total interest" value={fmtCurrency(result.totalInterest)} color="text-red-400" />
          {interestSaved != null && interestSaved > 0.5 && (
            <Stat label="Interest saved" value={fmtCurrency(interestSaved)} color="text-green-400" sub="vs. minimum only" />
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-400">Payment is too low to pay off this debt — increase your monthly payment.</p>
      )}

      {minResult && result && result.months < minResult.months && (
        <p className="text-xs text-gray-500">
          Paying {fmtCurrency(parsed)} instead of the {fmtCurrency(debt.minimum_payment)} minimum saves you{" "}
          <span className="text-green-400">{minResult.months - result.months} months</span>.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, sub, color = "text-white" }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-sm font-semibold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

// ── Debt Form ─────────────────────────────────────────────────────────────────

function DebtForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inp = "bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 w-full";

  const submit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      balance: parseFloat(form.balance),
      interest_rate: parseFloat(form.interest_rate),
      minimum_payment: parseFloat(form.minimum_payment),
      credit_limit: form.credit_limit !== "" ? parseFloat(form.credit_limit) : null,
      notes: form.notes || null,
    });
  };

  return (
    <form onSubmit={submit} className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-400">Name</label>
          <input required className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Chase Sapphire" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Type</label>
          <select className={inp} value={form.type} onChange={(e) => set("type", e.target.value)}>
            {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Current balance ($)</label>
          <input required type="number" step="0.01" min="0" className={inp} value={form.balance} onChange={(e) => set("balance", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400">APR (%)</label>
          <input required type="number" step="0.01" min="0" className={inp} value={form.interest_rate} onChange={(e) => set("interest_rate", e.target.value)} placeholder="19.99" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Minimum payment ($)</label>
          <input required type="number" step="0.01" min="0" className={inp} value={form.minimum_payment} onChange={(e) => set("minimum_payment", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400">Credit limit ($) <span className="text-gray-600">optional</span></label>
          <input type="number" step="0.01" min="0" className={inp} value={form.credit_limit} onChange={(e) => set("credit_limit", e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400">Notes <span className="text-gray-600">optional</span></label>
        <input className={inp} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded">Save</button>
        <button type="button" onClick={onCancel} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-1.5 rounded">Cancel</button>
      </div>
    </form>
  );
}

// ── Debt Card ─────────────────────────────────────────────────────────────────

function DebtCard({ debt, onEdit, onDelete, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [payments, setPayments] = useState(null);

  const loadPayments = async () => {
    if (payments) return;
    const res = await debtsApi.payments(debt.id);
    setPayments(res.data);
  };

  const toggle = () => {
    setExpanded((v) => !v);
    if (!expanded) loadPayments();
  };

  const minResult = calcPayoff(debt.balance, debt.interest_rate, debt.minimum_payment);
  const utilization = debt.credit_limit ? (debt.balance / debt.credit_limit) * 100 : null;
  const utilizationColor = utilization == null ? "" : utilization >= 90 ? "text-red-400" : utilization >= 70 ? "text-amber-400" : "text-green-400";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{debt.name}</p>
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">
              {DEBT_TYPES.find((t) => t.value === debt.type)?.label ?? debt.type}
            </span>
            <span className="text-xs text-gray-500">{debt.interest_rate}% APR</span>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2">
            <Stat label="Balance" value={fmtCurrency(debt.balance)} color="text-red-400" />
            <Stat label="Min payment" value={fmtCurrency(debt.minimum_payment)} />
            {minResult && <Stat label="Payoff" value={fmtDate(minResult.payoffDate)} sub="at minimum" />}
            {minResult && <Stat label="Total interest" value={fmtCurrency(minResult.totalInterest)} color="text-amber-400" />}
            {utilization != null && (
              <Stat label="Utilization" value={`${utilization.toFixed(0)}%`} color={utilizationColor} sub={`of ${fmtCurrency(debt.credit_limit)}`} />
            )}
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button onClick={toggle} className="text-xs text-gray-500 hover:text-gray-300">
            {expanded ? "Less" : "More"}
          </button>
          <button onClick={onEdit} className="text-xs text-gray-500 hover:text-gray-300">Edit</button>
          <button onClick={onDelete} className="text-xs text-red-600 hover:text-red-400">Delete</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 px-4 pb-4">
          <PayoffModeler debt={debt} />

          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Payment history</p>
            {payments == null ? (
              <p className="text-xs text-gray-600">Loading…</p>
            ) : payments.payments.length === 0 ? (
              <p className="text-xs text-gray-600">No payments linked yet. Open a transaction and use "Attribute to debt" to link payments.</p>
            ) : (
              <div className="space-y-1">
                {payments.payments.map((p) => (
                  <div key={p.id} className="flex justify-between text-xs text-gray-400">
                    <span>{p.date} — {p.description}</span>
                    <span className="text-green-400">{fmtCurrency(Math.abs(p.amount))}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs font-semibold text-gray-300 border-t border-gray-800 pt-1 mt-1">
                  <span>Total paid</span>
                  <span className="text-green-400">{fmtCurrency(payments.total_paid)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Multi-debt summary ────────────────────────────────────────────────────────

function MultiDebtSummary({ debts }) {
  if (debts.length < 2) return null;
  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayment = debts.reduce((s, d) => s + d.minimum_payment, 0);
  const weightedAPR = debts.reduce((s, d) => s + d.interest_rate * d.balance, 0) / totalBalance;

  // Avalanche: highest APR first
  const avalanche = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
  // Snowball: lowest balance first
  const snowball = [...debts].sort((a, b) => a.balance - b.balance);

  const simulateStrategy = (ordered) => {
    let states = ordered.map((d) => ({ balance: d.balance, rate: d.interest_rate / 100 / 12, min: d.minimum_payment }));
    let extra = 0;
    let totalInterest = 0;
    let months = 0;
    while (states.some((s) => s.balance > 0) && months < 600) {
      // First apply minimums + accrue interest
      states = states.map((s) => {
        if (s.balance <= 0) return s;
        const interest = s.balance * s.rate;
        totalInterest += interest;
        return { ...s, balance: Math.max(0, s.balance + interest - s.min) };
      });
      // Extra payment goes to first non-zero
      let extraLeft = extra;
      states = states.map((s) => {
        if (s.balance <= 0 || extraLeft <= 0) return s;
        const pay = Math.min(extraLeft, s.balance);
        extraLeft -= pay;
        return { ...s, balance: s.balance - pay };
      });
      // Freed minimums roll forward as extra
      extra = states.filter((s) => s.balance <= 0).reduce((sum, s) => sum + s.min, 0);
      months++;
    }
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
    return { months, totalInterest, payoffDate };
  };

  const avResult = simulateStrategy(avalanche);
  const sbResult = simulateStrategy(snowball);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Debt overview</p>
      <div className="grid grid-cols-4 gap-4">
        <Stat label="Total balance" value={fmtCurrency(totalBalance)} color="text-red-400" />
        <Stat label="Avg APR" value={`${weightedAPR.toFixed(2)}%`} color="text-amber-400" />
        <Stat label="Total min payments" value={fmtCurrency(totalMinPayment)} />
        <Stat label="# of debts" value={debts.length} />
      </div>
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs text-gray-500 mb-2">Payoff strategies (minimum payments only, rolling freed payments forward)</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-medium text-blue-400">Avalanche (highest APR first)</p>
            <Stat label="Payoff date" value={fmtDate(avResult.payoffDate)} sub={`${avResult.months} months`} />
            <Stat label="Total interest" value={fmtCurrency(avResult.totalInterest)} color="text-red-400" />
          </div>
          <div className="bg-gray-900 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-medium text-purple-400">Snowball (lowest balance first)</p>
            <Stat label="Payoff date" value={fmtDate(sbResult.payoffDate)} sub={`${sbResult.months} months`} />
            <Stat label="Total interest" value={fmtCurrency(sbResult.totalInterest)} color="text-red-400" />
          </div>
        </div>
        {avResult.totalInterest < sbResult.totalInterest && (
          <p className="text-xs text-gray-500 mt-2">
            Avalanche saves you{" "}
            <span className="text-green-400">{fmtCurrency(sbResult.totalInterest - avResult.totalInterest)}</span>
            {" "}in interest vs. snowball.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Debts() {
  const [debts, setDebts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const res = await debtsApi.list();
    setDebts(res.data);
  };

  useEffect(() => { load(); }, []);

  const create = async (data) => {
    await debtsApi.create(data);
    setAdding(false);
    load();
  };

  const update = async (id, data) => {
    await debtsApi.update(id, data);
    setEditing(null);
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this debt account?")) return;
    await debtsApi.delete(id);
    load();
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Debts & Loans</h1>
        <button onClick={() => setAdding(true)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded">
          + Add debt
        </button>
      </div>

      {adding && <DebtForm onSave={create} onCancel={() => setAdding(false)} />}

      <MultiDebtSummary debts={debts} />

      {debts.length === 0 && !adding && (
        <p className="text-gray-500 text-sm text-center py-12">No debts tracked yet. Add a credit card or loan to get started.</p>
      )}

      {debts.map((debt) =>
        editing === debt.id ? (
          <DebtForm
            key={debt.id}
            initial={debt}
            onSave={(data) => update(debt.id, data)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <DebtCard
            key={debt.id}
            debt={debt}
            onEdit={() => setEditing(debt.id)}
            onDelete={() => remove(debt.id)}
            onRefresh={load}
          />
        )
      )}
    </div>
    </div>
  );
}
