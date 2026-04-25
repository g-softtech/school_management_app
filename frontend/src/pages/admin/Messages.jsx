import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiSend, FiRadio } from 'react-icons/fi';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { getInbox, broadcast, sendMessage, getContacts } from '../../services/messageService';
import { formatDateTime, getInitials, getErrorMessage } from '../../utils/helpers';

export default function AdminMessages() {
  const [inbox, setInbox]         = useState([]);
  const [contacts, setContacts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showCompose, setShowCompose]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ targetRole: 'student', subject: '', content: '' });
  const [composeForm, setComposeForm]     = useState({ receiverId: '', subject: '', content: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ir, cr] = await Promise.all([getInbox({ limit: 20 }), getContacts()]);
      setInbox(ir.data.data);
      setContacts(cr.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleBroadcast = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const res = await broadcast(broadcastForm);
      toast.success(res.data.message);
      setShowBroadcast(false); setBroadcastForm({ targetRole: 'student', subject: '', content: '' });
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleSend = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await sendMessage(composeForm);
      toast.success('Message sent');
      setShowCompose(false); setComposeForm({ receiverId: '', subject: '', content: '' }); fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const ROLES = ['admin', 'teacher', 'student', 'parent'];
  const roleColor = { admin: 'purple', teacher: 'blue', student: 'green', parent: 'warning' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Messages</h1></div>
        <div className="flex gap-2">
          <button onClick={() => setShowCompose(true)} className="btn-secondary"><FiSend size={15} />Compose</button>
          <button onClick={() => setShowBroadcast(true)} className="btn-primary"><FiRadio size={15} />Broadcast</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Inbox */}
        <div className="lg:col-span-2 card">
          <h3 className="section-title">Inbox</h3>
          {loading ? <div className="py-10 text-center text-secondary-400 text-sm">Loading...</div> :
          inbox.length === 0 ? <div className="py-10 text-center text-secondary-400 text-sm">No messages</div> :
          <div className="space-y-2">
            {inbox.map((m) => (
              <div key={m._id} className={`p-3 rounded-xl border transition-colors ${m.isRead ? 'border-secondary-100 bg-white' : 'border-primary-200 bg-primary-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary-200 flex items-center justify-center text-secondary-600 text-xs font-bold flex-shrink-0">
                    {getInitials(m.senderId?.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-secondary-800 truncate">{m.senderId?.name || 'Unknown'}</p>
                      <Badge variant={roleColor[m.senderId?.role] || 'gray'}>{m.senderId?.role}</Badge>
                    </div>
                    {m.subject && <p className="text-xs font-medium text-secondary-600 mt-0.5">{m.subject}</p>}
                    <p className="text-xs text-secondary-500 mt-0.5 line-clamp-1">{m.content}</p>
                    <p className="text-xs text-secondary-400 mt-1">{formatDateTime(m.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>}
        </div>

        {/* Contacts */}
        <div className="card">
          <h3 className="section-title">Recent Contacts</h3>
          {contacts.length === 0 ? <p className="text-secondary-400 text-sm text-center py-8">No conversations yet</p> :
          <div className="space-y-2">
            {contacts.slice(0, 10).map((c) => (
              <div key={c.user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary-50 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                  {getInitials(c.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-secondary-800 truncate">{c.user.name}</p>
                  <p className="text-xs text-secondary-400 truncate">{c.lastMessage || 'No messages'}</p>
                </div>
                {c.unreadCount > 0 && <span className="w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">{c.unreadCount}</span>}
              </div>
            ))}
          </div>}
        </div>
      </div>

      {/* Broadcast Modal */}
      <Modal isOpen={showBroadcast} onClose={() => setShowBroadcast(false)} title="Broadcast Announcement">
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div><label className="input-label">Send to *</label>
            <select className="input-field" value={broadcastForm.targetRole} onChange={(e) => setBroadcastForm({ ...broadcastForm, targetRole: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}s</option>)}
            </select>
          </div>
          <div><label className="input-label">Subject</label><input className="input-field" value={broadcastForm.subject} onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })} /></div>
          <div><label className="input-label">Message *</label><textarea rows={4} className="input-field" value={broadcastForm.content} onChange={(e) => setBroadcastForm({ ...broadcastForm, content: e.target.value })} required /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowBroadcast(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Sending...' : 'Send Broadcast'}</button>
          </div>
        </form>
      </Modal>

      {/* Compose Modal */}
      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title="Compose Message">
        <form onSubmit={handleSend} className="space-y-4">
          <div><label className="input-label">Receiver ID *</label><input className="input-field" placeholder="Paste user _id" value={composeForm.receiverId} onChange={(e) => setComposeForm({ ...composeForm, receiverId: e.target.value })} required /></div>
          <div><label className="input-label">Subject</label><input className="input-field" value={composeForm.subject} onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })} /></div>
          <div><label className="input-label">Message *</label><textarea rows={4} className="input-field" value={composeForm.content} onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })} required /></div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowCompose(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Sending...' : 'Send'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}