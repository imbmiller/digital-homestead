const STATUS_STYLES = {
  new: "bg-green-900/40 text-green-400",
  duplicate: "bg-gray-800 text-gray-600",
  ambiguous: "bg-amber-900/40 text-amber-400",
};

export default function PreviewTable({ rows }) {
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] || 0) + 1 }), {});

  return (
    <div>
      <div className="flex gap-4 text-xs mb-3">
        <span className="text-green-400">{counts.new ?? 0} new</span>
        <span className="text-gray-500">{counts.duplicate ?? 0} duplicate</span>
        {counts.ambiguous > 0 && <span className="text-amber-400">{counts.ambiguous} ambiguous</span>}
      </div>
      <div className="overflow-y-auto max-h-96 scrollbar-thin rounded-lg border border-gray-800">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-900 border-b border-gray-800 text-gray-500 uppercase">
            <tr>
              <th className="text-left px-3 py-2">Date</th>
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-right px-3 py-2">Amount</th>
              <th className="text-left px-3 py-2">Category</th>
              <th className="text-left px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.row_index} className={`border-b border-gray-800/40 ${r.status === "duplicate" ? "opacity-40" : ""}`}>
                <td className="px-3 py-2 text-gray-400">{r.date}</td>
                <td className="px-3 py-2 text-gray-200 max-w-xs truncate">{r.description}</td>
                <td className={`px-3 py-2 text-right font-mono ${r.amount > 0 ? "text-green-400" : "text-gray-200"}`}>
                  ${Math.abs(r.amount).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-gray-400">
                  {r.suggested_category_name ?? <span className="text-amber-500">Inbox</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
