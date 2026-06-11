import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
);

export const authApi = {
  login: (username, password) => api.post("/auth/login", { username, password }),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me"),
  register: (username, password) => api.post("/auth/register", { username, password }),
};

export const accountsApi = {
  list: () => api.get("/accounts/"),
  create: (data) => api.post("/accounts/", data),
  update: (id, data) => api.patch(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
};

export const categoriesApi = {
  list: () => api.get("/categories/"),
  create: (data) => api.post("/categories/", data),
  update: (id, data) => api.patch(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  reorder: (order) => api.patch("/categories/reorder", order),
};

export const transactionsApi = {
  list: (params) => api.get("/transactions/", { params }),
  get: (id) => api.get(`/transactions/${id}`),
  update: (id, data) => api.patch(`/transactions/${id}`, data),
  updateSplits: (id, splits) => api.put(`/transactions/${id}/splits`, { splits }),
  bulkUpdate: (ids, data) => api.post("/transactions/bulk-update", { ids, ...data }),
  importPreview: (accountId, file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post(`/transactions/import/preview?account_id=${accountId}`, form);
  },
  importConfirm: (accountId, rows) =>
    api.post(`/transactions/import/confirm?account_id=${accountId}`, rows),
};

export const budgetsApi = {
  list: (month) => api.get("/budgets/", { params: month ? { month } : {} }),
  upsert: (data) => api.post("/budgets/", data),
  update: (id, data) => api.patch(`/budgets/${id}`, data),
  rollover: (month) => api.get("/budgets/rollover", { params: { month } }),
};

export const debtsApi = {
  list: () => api.get("/debts/"),
  create: (data) => api.post("/debts/", data),
  update: (id, data) => api.patch(`/debts/${id}`, data),
  delete: (id) => api.delete(`/debts/${id}`),
  payments: (id) => api.get(`/debts/${id}/payments`),
};

export const rulesApi = {
  list: () => api.get("/rules/"),
  create: (data) => api.post("/rules/", data),
  update: (id, data) => api.patch(`/rules/${id}`, data),
  delete: (id) => api.delete(`/rules/${id}`),
  test: (id) => api.post(`/rules/${id}/test`),
  apply: (id, mode = "all", date_from = null) => api.post(`/rules/${id}/apply`, { mode, date_from }),
  bulkApply: (mode, date_from) => api.post("/rules/bulk-apply", { mode, date_from: date_from || null }),
  reorder: (order) => api.put("/rules/reorder", order),
};

export const reportsApi = {
  spending: (date_from, date_to) => api.get("/reports/spending", { params: { date_from, date_to } }),
  monthlyTrend: (months = 6) => api.get("/reports/monthly-trend", { params: { months } }),
  incomeExpense: (date_from, date_to) => api.get("/reports/income-expense", { params: { date_from, date_to } }),
  recurring: () => api.get("/reports/recurring"),
  cashflow: (days = 90) => api.get("/reports/cashflow", { params: { days } }),
  netWorth: () => api.get("/reports/net-worth"),
};

export const assetsApi = {
  list: () => api.get("/assets/"),
  create: (data) => api.post("/assets/", data),
  update: (id, data) => api.patch(`/assets/${id}`, data),
  delete: (id) => api.delete(`/assets/${id}`),
};

export const goalsApi = {
  list: () => api.get("/goals/"),
  create: (data) => api.post("/goals/", data),
  update: (id, data) => api.patch(`/goals/${id}`, data),
  delete: (id) => api.delete(`/goals/${id}`),
  progress: (id) => api.get(`/goals/${id}/progress`),
};

export default api;
