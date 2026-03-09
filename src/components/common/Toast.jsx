export default function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.type}${t.exiting ? " toast-exit" : ""}`}
        >
          <span className="toast-icon">
            {t.type === "success" ? "\u2713" : t.type === "error" ? "\u2717" : "\u2139"}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
