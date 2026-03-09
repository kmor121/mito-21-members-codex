export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  if (!message) return null;
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p>{message}</p>
        <div className="actions">
          <button className="button" type="button" onClick={onConfirm}>OK</button>
          <button className="button ghost" type="button" onClick={onCancel}>キャンセル</button>
        </div>
      </div>
    </div>
  );
}
