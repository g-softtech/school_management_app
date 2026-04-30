import { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiUser } from 'react-icons/fi';
import Modal from './Modal';
import { getDirectory } from '../../services/messageService';
import { getInitials } from '../../utils/helpers';

const ROLE_COLORS = {
  admin:   'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  student: 'bg-green-100 text-green-700',
  parent:  'bg-amber-100 text-amber-700',
};

/**
 * UserPickerModal
 * A searchable modal that lets the user pick someone to message.
 *
 * Props:
 *   isOpen     bool
 *   onClose    () => void
 *   onSelect   (user: { _id, name, role }) => void
 *   roleFilter optional — restrict to one role e.g. 'teacher'
 *   title      optional — modal title
 */
export default function UserPickerModal({ isOpen, onClose, onSelect, roleFilter = '', title = 'New Message' }) {
  const [search, setSearch]   = useState('');
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = useCallback(async (q) => {
    setLoading(true);
    try {
      const res = await getDirectory({
        search:     q || undefined,
        role:       roleFilter || undefined,
        limit:      50,
      });
      setUsers(res.data.data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  // Load on open
  useEffect(() => {
    if (isOpen) { setSearch(''); fetchUsers(''); }
  }, [isOpen, fetchUsers]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, isOpen, fetchUsers]);

  const handleSelect = (user) => {
    onSelect(user);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="input-field pl-9 w-full"
            autoFocus
          />
        </div>

        {/* User list */}
        <div className="max-h-72 overflow-y-auto space-y-1 -mx-1 px-1">
          {loading ? (
            <div className="space-y-2 py-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-secondary-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-secondary-400">
              <FiUser size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            users.map((u) => (
              <button
                key={u._id}
                onClick={() => handleSelect(u)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary-50 transition-colors text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-secondary-200 group-hover:bg-primary-100 flex items-center justify-center text-secondary-600 text-xs font-bold flex-shrink-0 transition-colors">
                  {getInitials(u.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-800 truncate">{u.name}</p>
                  <p className="text-xs text-secondary-400 truncate">{u.email}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${ROLE_COLORS[u.role] || 'bg-secondary-100 text-secondary-600'}`}>
                  {u.role}
                </span>
              </button>
            ))
          )}
        </div>

        <button onClick={onClose} className="btn-secondary w-full text-sm">
          Cancel
        </button>
      </div>
    </Modal>
  );
}
