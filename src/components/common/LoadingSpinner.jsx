export default function LoadingSpinner({ message = "読み込み中..." }) {
  return (
    <div className="loading-state">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
}
