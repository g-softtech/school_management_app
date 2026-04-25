import Modal from './Modal';
export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, loading }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm action'} size="sm">
      <p className="text-secondary-600 text-sm">{message || 'Are you sure you want to proceed?'}</p>
      <div className="flex gap-3 mt-5 justify-end">
        <button onClick={onClose} className="btn-secondary text-sm py-1.5">Cancel</button>
        <button onClick={onConfirm} disabled={loading} className="btn-danger text-sm py-1.5">
          {loading ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </Modal>
  );
}