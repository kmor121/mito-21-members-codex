import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ open, title, message, children, confirmLabel, cancelLabel, confirmStyle, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        className="modal-dialog"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        tabIndex={-1}
      >
        {title && (
          <div className="modal-header">
            <h3>{title}</h3>
            <button type="button" className="modal-close" onClick={onCancel}>&times;</button>
          </div>
        )}
        <div className="modal-body">
          {message && <p style={{ margin: '0.5rem 0' }}>{message}</p>}
          {children}
        </div>
        <div className="modal-footer">
          <button
            className="button"
            type="button"
            style={confirmStyle || {}}
            onClick={onConfirm}
          >
            {confirmLabel || "OK"}
          </button>
          <button className="button ghost" type="button" onClick={onCancel}>
            {cancelLabel || "キャンセル"}
          </button>
        </div>
      </div>
    </div>
  );
}
