import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from "react-router-dom";
import { authApi } from "./api";
import { useAppStore } from "./store";
import Board from "./pages/Board";
import Transactions from "./pages/Transactions";
import Import from "./pages/Import";
import Rules from "./pages/Rules";
import Debts from "./pages/Debts";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Goals from "./pages/Goals";
import Reconcile from "./pages/Reconcile";
import Login from "./pages/Login";

const NAV_ITEMS = [
  { to: "/", label: "Board", end: true },
  { to: "/transactions", label: "Transactions" },
  { to: "/reports", label: "Reports" },
  { to: "/goals", label: "Goals" },
  { to: "/import", label: "Import" },
  { to: "/rules", label: "Rules" },
  { to: "/reconcile", label: "Reconcile" },
  { to: "/debts", label: "Debts" },
  { to: "/settings", label: "Settings" },
];

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <rect y="3" width="20" height="2" rx="1" />
      <rect y="9" width="20" height="2" rx="1" />
      <rect y="15" width="20" height="2" rx="1" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Nav() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAppStore((s) => s.setUser);
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    navigate("/login");
  };

  const desktopLink = ({ isActive }) =>
    `px-3 py-1.5 rounded text-sm font-medium transition-colors ${
      isActive ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
    }`;

  const mobileLink = ({ isActive }) =>
    `block px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      isActive ? "bg-gray-700 text-white" : "text-gray-300 hover:text-white hover:bg-gray-800"
    }`;

  return (
    <nav className="bg-gray-900 border-b border-gray-800 shrink-0">
      <div className="flex items-center gap-1 px-4 py-2">
        <span className="font-bold text-white mr-4">HomeBase</span>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={desktopLink}>{label}</NavLink>
          ))}
          <button onClick={logout} className="ml-auto shrink-0 text-xs text-gray-500 hover:text-gray-300">
            Sign out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden ml-auto p-1 text-gray-400 hover:text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <CloseIcon /> : <HamburgerIcon />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t border-gray-800 px-3 py-2 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={mobileLink}>{label}</NavLink>
          ))}
          <button
            onClick={logout}
            className="block px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-lg text-left mt-1 border-t border-gray-800 pt-3"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

function AppShell() {
  return (
    <div className="flex flex-col h-dvh">
      <Nav />
      <div className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<Board />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/import" element={<Import />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/debts" element={<Debts />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/reconcile" element={<Reconcile />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  const [checking, setChecking] = useState(true);
  const { user, setUser } = useAppStore();

  useEffect(() => {
    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="flex h-dvh items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/*" element={user ? <AppShell /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
