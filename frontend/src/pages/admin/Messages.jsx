import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiSend, FiRadio, FiEdit } from 'react-icons/fi';
import Modal from '../../components/common/Modal';
import UserPickerModal from '../../components/common/UserPickerModal';
import Badge from '../../components/common/Badge';
import {
  getInbox, broadcast, sendMessage, getContacts, getConversation, markAllAsRead,
} from '../../services/messageService';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, getInitials, getErrorMessage } from '../../utils/helpers';

const ROLE_COLOR = { admin: 'purple', teacher: 'blue', student: 'green', parent: 'warning' };

export default function AdminMessages() {
  const { user } = useAuth();
  const [inbox, setInbox]           = useState([]);
  const [contacts, setContacts]     = useState([]);
  const [thread, setThread]         = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [replyText, setReplyText]   = useState('');
  const [sending, setSending]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ targetRole: 'student', subject: '', content: '' });
  const [composeForm, setComposeForm] = useState({ receiverId: '', receiverName: '', subject: '', content: '' });
  const [showCompose, setShowCompose] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ir, cr] = await Promise.all([
        getInbox({ limit: 30 }),
        getContacts(),
      ]);
      setInbox(ir.data.data || []);
      const mapped = (cr.data.data || []).map((item) => ({
        _id:         item.user?.id || item.user?._id,
        name:        item.user?.name,
        role:        item.user?.role,
        unreadCount: item.unreadCount,
        lastMessage: item.lastMessage,
      }));
      setContacts(mapped);
      await markAllAsRead();
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Load conversation when contact selected
  useEffect(() => {
    if (!activeContact) return;
    getConversation(activeContact._id)
      .then((r) => setThread(r.data.data || []))
      .catch(() => {});
  }, [activeContact]);

  // Handle user picked from directory — open compose with them pre-filled
  const handlePickUser = (pickedUser) => {
    setComposeForm({ receiverId: pickedUser._id, receiverName: pickedUser.name, subject: '', content: '' });
    setShowCompose(true);
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.content) { toast.error('Message content required'); return; }
    setSending(true);
    try {
      const res = await broadcast(broadcastForm);
      toast.success(res.data.message);
      setShowBroadcast(false);
      setBroadcastForm({ targetRole: 'student', subject: '', content: '' });
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSending(false); }
  };

  const handleSendDirect = async (e) => {
    e.preventDefault();
    if (!composeForm.receiverId || !composeForm.content) { toast.error('Please select a recipient and write a message'); return; }
    setSending(true);
    try {
      await sendMessage({ receiverId: composeForm.receiverId, subject: composeForm.subject, content: composeForm.content });
      toast.success('Message sent!');
      setShowCompose(false);
      setComposeForm({ receiverId: '', receiverName: '', subject: '', content: '' });
      fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSending(false); }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !activeContact) return;
    setSending(true);
    try {
      await sendMessage({ receiverId: activeContact._id, content: replyText.trim() });
      setReplyText('');
      const r = await getConversation(activeContact._id);
      setThread(r.data.data || []);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSending(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Communicate with staff, students and parents</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPicker(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <FiEdit size={15} /> Compose
          </button>
          <button onClick={() => setShowBroadcast(true)} className="btn-primary flex items-center gap-2 text-sm">
            <FiRadio size={15} /> Broadcast
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Inbox + thread panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* Active conversation */}
          {activeContact ? (
            <div className="card p-0 overflow-hidden flex flex-col" style={{ height: '420px' }}>
              <div className="px-4 py-3 border-b border-secondary-100 flex items-center gap-3 bg-secondary-50">
                <button onClick={() => setActiveContact(null)} className="text-xs text-secondary-400 hover:text-secondary-600">← Back</button>
                <div className="w-8 h-8 rounded-lg bg-secondary-200 flex items-center justify-center text-secondary-600 text-xs font-bold">
                  {getInitials(activeContact.name)}
                </div>
                <div>
                  <p className="font-semibold text-secondary-800 text-sm">{activeContact.name}</p>
                  <p className="text-xs text-secondary-400 capitalize">{activeContact.role}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {thread.length === 0 && <p className="text-center text-secondary-400 text-sm py-8">No messages yet.</p>}
                {thread.map((msg) => {
                  const mine = String(msg.senderId?._id || msg.senderId) === String(user?._id);
                  return (
                    <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-sm px-4 py-2.5 rounded-2xl text-sm ${mine ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-secondary-100 text-secondary-800 rounded-bl-sm'}`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${mine ? 'text-primary-200' : 'text-secondary-400'}`}>{formatDateTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-3 border-t border-secondary-100 flex gap-2">
                <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleReply()} placeholder="Type a reply…" className="input-field flex-1 py-2 text-sm" />
                <button onClick={handleReply} disabled={sending || !replyText.trim()} className="btn-primary px-4">
                  <FiSend size={15} />
                </button>
              </div>
            </div>
          ) : (
            /* Inbox list */
            <div className="card space-y-3">
              <h3 className="section-title">Inbox</h3>
              {loading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-secondary-50 rounded-xl animate-pulse" />)}</div>
              ) : inbox.length === 0 ? (
                <p className="text-center text-secondary-400 text-sm py-10">No messages yet</p>
              ) : (
                <div className="space-y-2">
                  {inbox.map((m) => (
                    <div key={m._id} className={`p-3 rounded-xl border transition-colors cursor-pointer hover:border-primary-200 ${m.isRead ? 'border-secondary-100 bg-white' : 'border-primary-200 bg-primary-50'}`}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-secondary-200 flex items-center justify-center text-secondary-600 text-xs font-bold flex-shrink-0">
                          {getInitials(m.senderId?.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className={`text-sm truncate ${m.isRead ? 'font-medium text-secondary-700' : 'font-bold text-secondary-800'}`}>
                              {m.senderId?.name || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-2">
                              {m.isBroadcast && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Broadcast</span>}
                              <Badge variant={ROLE_COLOR[m.senderId?.role] || 'gray'}>{m.senderId?.role}</Badge>
                            </div>
                          </div>
                          {m.subject && <p className="text-xs font-medium text-secondary-600 mt-0.5">{m.subject}</p>}
                          <p className="text-xs text-secondary-500 mt-0.5 line-clamp-1">{m.content}</p>
                          <p className="text-xs text-secondary-400 mt-1">{formatDateTime(m.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Contacts sidebar */}
        <div className="card space-y-3">
          <h3 className="section-title">Conversations</h3>
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-secondary-400">
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Click Compose to start one</p>
            </div>
          ) : (
            <div className="space-y-1">
              {contacts.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setActiveContact(c)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary-50 transition-colors text-left ${activeContact?._id === c._id ? 'bg-primary-50 border border-primary-100' : ''}`}
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-secondary-200 flex items-center justify-center text-secondary-600 text-xs font-bold">
                      {getInitials(c.name)}
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">{c.unreadCount}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-800 truncate">{c.name}</p>
                    <p className="text-xs text-secondary-400 truncate">{c.lastMessage || 'No messages yet'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Picker Modal — for compose */}
      <UserPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handlePickUser}
        title="Choose Recipient"
      />

      {/* Compose Modal — pre-filled after picker */}
      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title="Compose Message" size="md">
        <form onSubmit={handleSendDirect} className="space-y-4">
          <div className="p-3 bg-secondary-50 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
              {getInitials(composeForm.receiverName)}
            </div>
            <div>
              <p className="text-xs text-secondary-500">Sending to</p>
              <p className="font-semibold text-secondary-800 text-sm">{composeForm.receiverName}</p>
            </div>
            <button type="button" onClick={() => { setShowCompose(false); setShowPicker(true); }} className="ml-auto text-xs text-primary-500 hover:underline">
              Change
            </button>
          </div>
          <div>
            <label className="input-label">Subject (optional)</label>
            <input className="input-field" placeholder="e.g. Regarding your results" value={composeForm.subject} onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Message *</label>
            <textarea rows={5} className="input-field resize-none" placeholder="Type your message here…" value={composeForm.content} onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })} required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowCompose(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={sending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <FiSend size={14} /> {sending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Broadcast Modal */}
      <Modal isOpen={showBroadcast} onClose={() => setShowBroadcast(false)} title="Broadcast Announcement" size="md">
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
            📢 This message will be sent to <strong>all users</strong> of the selected role.
          </div>
          <div>
            <label className="input-label">Send To *</label>
            <select className="input-field" value={broadcastForm.targetRole} onChange={(e) => setBroadcastForm({ ...broadcastForm, targetRole: e.target.value })}>
              {['student', 'teacher', 'parent', 'admin'].map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}s</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Subject (optional)</label>
            <input className="input-field" placeholder="e.g. School Closure Notice" value={broadcastForm.subject} onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })} />
          </div>
          <div>
            <label className="input-label">Message *</label>
            <textarea rows={5} className="input-field resize-none" placeholder="Type your announcement here…" value={broadcastForm.content} onChange={(e) => setBroadcastForm({ ...broadcastForm, content: e.target.value })} required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowBroadcast(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={sending} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <FiRadio size={14} /> {sending ? 'Sending…' : 'Send Broadcast'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
