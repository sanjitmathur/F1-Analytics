const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  downloading: { bg: "#ede9fe", text: "#5b21b6", label: "Downloading" },
  pending: { bg: "#fef3c7", text: "#92400e", label: "Pending" },
  processing: { bg: "#dbeafe", text: "#1e40af", label: "Processing" },
  completed: { bg: "#d1fae5", text: "#065f46", label: "Completed" },
  failed: { bg: "#fee2e2", text: "#991b1b", label: "Failed" },
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {style.label}
    </span>
  );
}
