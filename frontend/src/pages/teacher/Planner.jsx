import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiSend } from 'react-icons/fi';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { getInbox, getSent, getContacts, sendMessage, getConversation, markAllAsRead } from '../../services/messageService';
import { formatDateTime, getInitials, getErrorMessage } from '../../utils/helpers';

export default function TeacherMessages() {
  const [contacts, setContacts]       = useState([]);
  const [messages, setMessages]       = useState([]);
  const [inbox, setInbox]             = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [reply, setReply]             = useState('');
  const [composeForm, setComposeForm] = useState({ receiverId: '', content: '', subject: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cr, ir] = await Promise.all([getContacts(), getInbox({ limit: 30 })]);
      setContacts(cr.data.data);
      setInbox(ir.data.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); markAllAsRead().catch(() => {}); }, [fetchAll]);

  const openConversation = async (contact) => {
    setActiveContact(contact);
    try {
      const res = await getConversation(contact.user.id);
      setMessages(res.data.data);
    } catch {}
  };

  const handleSendReply = async () => {
    if (!reply.trim() || !activeContact) return;
    setSaving(true);
    try {
      await sendMessage({ receiverId: activeContact.user.id, content: reply });
      setReply('');
      openConversation(activeContact);
      fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const handleCompose = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await sendMessage(composeForm);
      toast.success('Message sent');
      setShowCompose(false); setComposeForm({ receiverId: '', content: '', subject: '' }); fetchAll();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const roleColor = { admin: 'purple', teacher: 'blue', student: 'green', parent: 'warning' };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Messages</h1></div>
        <button onClick={() => setShowCompose(true)} className="btn-primary"><FiSend size={15} />Compose</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-[600px]">
        {/* Contacts list */}
        <div className="card overflow-y-auto">
          <h3 className="section-title">Conversations</h3>
          {loading ? <p className="text-secondary-400 text-sm text-center py-8">Loading...</p> :
          contacts.length === 0 ? <p className="text-secondary-400 text-sm text-center py-8">No conversations yet</p> :
          <div className="space-y-1">
            {contacts.map((c) => (
              <div key={c.user.id}
                onClick={() => openConversation(c)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${activeContact?.user.id === c.user.id ? 'bg-primary-50 border border-primary-200' : 'hover:bg-secondary-50'}`}>
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                  {getInitials(c.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-secondary-800 truncate">{c.user.name}</p>
                    {c.unreadCount > 0 && <span className="w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center flex-shrink-0">{c.unreadCount}</span>}
                  </div>
                  <p className="text-xs text-secondary-400 truncate">{c.lastMessage || '—'}</p>
                </div>
              </div>
            ))}
          </div>}
        </div>

        {/* Conversation thread */}
        <div className="lg:col-span-2 card flex flex-col overflow-hidden">
          {!activeContact ? (
            <div className="flex-1 min-w-0 flex items-center justify-center text-secondary-400 text-sm">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center gap-3 pb-4 border-b border-secondary-100 mb-4 flex-shrink-0">
                <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">
                  {getInitials(activeContact.user.name)}
                </div>
                <div>
                  <p className="font-semibold text-secondary-800 text-sm">{activeContact.user.name}</p>
                  <Badge variant={roleColor[activeContact.user.role] || 'gray'}>{activeContact.user.role}</Badge>
                </div>
              </div>
              <div className="flex-1 min-w-0 overflow-y-auto space-y-3 mb-4">
                {messages.map((m) => {
                  const isMe = m.senderId?._id === activeContact.user.id ? false : true;
                  return (
                    <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary-500 text-white rounded-br-sm' : 'bg-secondary-100 text-secondary-800 rounded-bl-sm'}`}>
                        <p>{m.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-primary-200' : 'text-secondary-400'}`}>{formatDateTime(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <input value={reply} onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  placeholder="Type a message..." className="input-field flex-1 min-w-0" />
                <button onClick={handleSendReply} disabled={saving || !reply.trim()} className="btn-primary px-4">
                  <FiSend size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title="New Message">
        <form onSubmit={handleCompose} className="space-y-4">
          <div><label className="input-label">Receiver ID *</label>
            <input className="input-field" placeholder="Paste student or admin user _id" value={composeForm.receiverId} onChange={(e) => setComposeForm({ ...composeForm, receiverId: e.target.value })} required />
          </div>
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