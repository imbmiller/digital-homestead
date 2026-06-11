export default function EmptyState({ message = "Nothing here yet." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-600">
      <div className="text-4xl mb-3">📭</div>
      <p className="text-sm">{message}</p>
    </div>
  );
}
