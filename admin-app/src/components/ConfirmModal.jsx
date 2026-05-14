import { Trash2, AlertTriangle } from 'lucide-react';

/**
 * ConfirmModal — A modern styled confirmation popup.
 * Props:
 *   title    : string  — headline text
 *   message  : string  — body text
 *   onConfirm: fn      — called when user clicks "Delete"
 *   onCancel : fn      — called when user clicks "Cancel" or backdrop
 */
export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="confirm-modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-modal-icon">
          <AlertTriangle size={32} color="#ef4444" />
        </div>
        <h3>{title || 'Are you sure?'}</h3>
        <p>{message || 'This action cannot be undone.'}</p>
        <div className="confirm-modal-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
