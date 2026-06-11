import { useState } from "react";
import { useAppStore } from "../store";
import { transactionsApi } from "../api";
import UploadZone from "../components/Import/UploadZone";
import PreviewTable from "../components/Import/PreviewTable";

export default function Import() {
  const { accounts, fetchAll, currentMonth } = useAppStore();
  const [accountId, setAccountId] = useState("");
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    if (!accountId) { setError("Select an account first"); return; }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await transactionsApi.importPreview(accountId, file);
      setPreview(res.data.rows);
    } catch (e) {
      setError(e.response?.data?.detail ?? "Failed to parse CSV");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      const newRows = preview.filter((r) => r.status === "new");
      const res = await transactionsApi.importConfirm(accountId, newRows);
      setResult(res.data);
      setPreview(null);
      fetchAll(currentMonth);
    } catch (e) {
      setError(e.response?.data?.detail ?? "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-lg font-semibold text-white">Import Transactions</h1>

      {result && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 text-sm text-green-300">
          Imported {result.imported} · Skipped {result.skipped} duplicates · {result.inbox} to Inbox
          <button onClick={() => setResult(null)} className="ml-3 underline text-green-400">Import more</button>
        </div>
      )}

      {/* Account selector */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-full max-w-xs"
        >
          <option value="">Select account…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!preview && !result && (
        <div className={loading ? "opacity-50 pointer-events-none" : ""}>
          <UploadZone onFile={handleFile} />
          {loading && <p className="text-center text-xs text-gray-500 mt-3 animate-pulse">Parsing…</p>}
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <PreviewTable rows={preview} />
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
            >
              {loading ? "Importing…" : `Import ${preview.filter((r) => r.status === "new").length} new transactions`}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
