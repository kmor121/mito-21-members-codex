export default function EmptyState({ message = "データがありません。" }) {
  return <p className="empty-state">{message}</p>;
}
