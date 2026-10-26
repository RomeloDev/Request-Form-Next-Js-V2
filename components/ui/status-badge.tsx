export default function StatusBadge({ status }: { status: "Verified" | "Not Verified" }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm leading-6 font-medium whitespace-nowrap ${status === "Verified" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-600"}`}>{status}</span>;
}
