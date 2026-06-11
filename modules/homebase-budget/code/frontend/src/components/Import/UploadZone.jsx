import { useRef, useState } from "react";

export default function UploadZone({ onFile }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
        dragging ? "border-blue-500 bg-blue-950/20" : "border-gray-700 hover:border-gray-600"
      }`}
    >
      <div className="text-4xl mb-3">📂</div>
      <p className="text-sm text-gray-300 font-medium">Drop your bank CSV here</p>
      <p className="text-xs text-gray-500 mt-1">or click to browse</p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
    </div>
  );
}
