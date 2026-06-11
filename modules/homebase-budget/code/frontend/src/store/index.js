import { create } from "zustand";
import { accountsApi, categoriesApi, transactionsApi, budgetsApi } from "../api";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";

const today = new Date();
const initialDateRange = {
  from: format(startOfMonth(today), "yyyy-MM-dd"),
  to: format(endOfMonth(today), "yyyy-MM-dd"),
  label: "This Month",
};

export const useAppStore = create((set, get) => ({
  user: null,
  accounts: [],
  categories: [],
  transactions: [],
  budgets: [],
  dateRange: initialDateRange,
  loading: false,
  error: null,

  setUser: (user) => set({ user }),

  getCurrentMonth: () => get().dateRange.from.slice(0, 7),

  setDateRange: (range) => {
    set({ dateRange: range });
    get().fetchTransactions(range, "date", "desc");
    get().fetchBudgets(range.from.slice(0, 7));
  },

  fetchAccounts: async () => {
    const res = await accountsApi.list();
    set({ accounts: res.data });
  },

  fetchCategories: async () => {
    const res = await categoriesApi.list();
    set({ categories: res.data });
  },

  fetchTransactions: async (range, sortBy = "date", sortDir = "desc", accountId) => {
    const r = range || get().dateRange;
    const params = { date_from: r.from, date_to: r.to, sort_by: sortBy, sort_dir: sortDir };
    if (accountId) params.account_id = accountId;
    const res = await transactionsApi.list(params);
    set({ transactions: res.data });
  },

  fetchBudgets: async (month) => {
    const m = month || get().getCurrentMonth();
    const res = await budgetsApi.list(m);

    if (res.data.length === 0) {
      // Auto carry-forward: look back up to 3 months for the most recent budget set
      for (let i = 1; i <= 3; i++) {
        const prevMonth = format(subMonths(parseISO(`${m}-01`), i), "yyyy-MM");
        const prevRes = await budgetsApi.list(prevMonth);
        if (prevRes.data.length > 0) {
          const created = await Promise.all(
            prevRes.data.map((b) =>
              budgetsApi.upsert({ category_id: b.category_id, month: m, allocated: b.allocated, rollover_cap: b.rollover_cap ?? null })
            )
          );
          set({ budgets: created.map((r) => r.data) });
          return;
        }
      }
    }

    set({ budgets: res.data });
  },

  updateTransaction: async (id, data) => {
    const res = await transactionsApi.update(id, data);
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? res.data : t)),
    }));
    return res.data;
  },

  moveTransaction: async (txnId, categoryId) => {
    return get().updateTransaction(txnId, { category_id: categoryId, is_reviewed: true });
  },

  fetchAll: async () => {
    set({ loading: true });
    try {
      const range = get().dateRange;
      await Promise.all([
        get().fetchAccounts(),
        get().fetchCategories(),
        get().fetchTransactions(range),
        get().fetchBudgets(range.from.slice(0, 7)),
      ]);
    } finally {
      set({ loading: false });
    }
  },

  getInboxCategory: () => get().categories.find((c) => c.name === "Inbox" && c.is_system),
  getCategoryById: (id) => get().categories.find((c) => c.id === id),

  getTransactionsByCategory: (categoryId) =>
    get().transactions.filter((t) => t.category_id === categoryId && !t.is_ignored && !t.is_transfer),

  getBudgetForCategory: (categoryId) =>
    get().budgets.find((b) => b.category_id === categoryId),

  getSpentForCategory: (categoryId) => {
    const txns = get().getTransactionsByCategory(categoryId);
    return txns.reduce((sum, t) => sum + (t.amount < 0 ? Math.abs(t.amount) : 0), 0);
  },
}));
