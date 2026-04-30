import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { FiSend, FiMessageSquare, FiSearch, FiEdit } from 'react-icons/fi';
import {
  getContacts, getConversation, sendMessage, markAllAsRead,
} from '../../services/messageService';
import UserPickerModal from '../../components/common/UserPickerModal';
import { useAuth } from '../../context/AuthContext';
import { formatDateTime, getInitials, getErrorMessage } from '../../utils/helpers';

export default function TeacherMessages() {
  const { user } = useAuth();
  const [contacts, setContacts]           = useState([]);
  const [thread, setThread]               = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [text, setText]                   = useState('');
  const [sending, setSending]             = useState(false);
  const [search, setSearch]               = useState('');
  const [loading, setLoading]             = useState(true);
  const [showPicker, setShowPicker]       = useState(false);
  const bottomRef = useRef();

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const cRes = await getContacts();
      const contactList = (cRes.data.data || []).map((item) => ({
        _id:         item.user?.id || item.user?._id,
        name:        item.user?.name,
        role:        item.user?.role,
        unreadCount: item.unreadCount,
        lastMessage: item.lastMessage,
      }));
      setContacts(contactList);
      await markAllAsRead();
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!activeContact) return;
    getConversation(activeContact._id)
      .then((r) => setThread(r.data.data || []))
      .catch(() => {});
  }, [activeContact]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread]);

  const handlePickUser = (pickedUser) => {
    setContacts((prev) => {
      const exists = prev.find((c) => String(c._id) === String(pickedUser._id));
      if (exists) return prev;
      return [{ _id: pickedUser._id, name: pickedUser.name, role: pickedUser.role, unreadCount: 0, lastMessage: null }, ...prev];
    });
    setActiveContact({ _id: pickedUser._id, name: pickedUser.name, role: pickedUser.role });
    setThread([]);
  };

  const handleSend = async () => {
    if (!text.trim() || !activeContact) return;
    setSending(true);
    try {
      await sendMessage({ receiverId: activeContact._id, content: text.trim() });
      setText('');
      const r = await getConversation(activeContact._id);
      setThread(r.data.data || []);
      loadBase();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setSending(false); }
  };

  const filteredContacts = contacts.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header — single New Message button only here */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Messages</h1>
          <p className="page-subtitle">Communicate with students, parents and admin</p>
        </div>
        <button onClick={() => setShowPicker(true)} className="btn-primary flex items-center gap-2 text-sm">
          <FiEdit size={14} /> New Message
        </button>
      </div>

      <div className="card p-0 overflow-hidden flex h-[580px]">

        {/* ── Contacts sidebar ── */}
        <div className="w-64 flex-shrink-0 border-r border-secondary-100 flex flex-col">
          <div className="p-3 border-b border-secondary-100">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contacts…"
                className="input-field pl-8 py-1.5 text-sm w-full"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-secondary-50 rounded-lg animate-pulse" />)}
              </div>
            ) : filteredContacts.length === 0 ? (
              /* Empty state — NO button here, only in header */
              <div className="text-center py-10 px-3 text-secondary-400">
                <FiMessageSquare size={24} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs">No conversations yet</p>
                <button
                  onClick={() => setShowPicker(true)}
                  className="text-xs text-primary-500 hover:underline mt-1"
                >
                  Start a new one →
                </button>
              </div>
            ) : (
              filteredContacts.map((c) => {
                const isActive = activeContact?._id === c._id;
                return (
                  <button
                    key={c._id}
                    onClick={() => setActiveContact(c)}
                    className={`w-full text-left px-3 py-3 hover:bg-secondary-50 transition-colors flex items-center gap-3 border-b border-secondary-50 ${isActive ? 'bg-primary-50 border-l-2 border-l-primary-500' : ''}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-secondary-200 flex items-center justify-center text-secondary-600 text-xs font-bold">
                        {getInitials(c.name)}
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-secondary-800 truncate">{c.name}</p>
                      <p className="text-xs text-secondary-400 capitalize">{c.role}</p>
                      {c.lastMessage && <p className="text-xs text-secondary-400 truncate">{c.lastMessage}</p>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeContact ? (
            /* Empty chat — NO duplicate button, just a hint */
            <div className="flex-1 flex flex-col items-center justify-center text-secondary-400 gap-2">
              <FiMessageSquare size={40} className="opacity-30" />
              <p className="text-sm font-medium">Select a contact to start messaging</p>
              <p className="text-xs">or click <span className="text-primary-500 font-semibold">New Message</span> above</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="px-4 py-3 border-b border-secondary-100 flex items-center gap-3 bg-white">
                <div className="w-9 h-9 rounded-xl bg-secondary-200 flex items-center justify-center text-secondary-600 text-xs font-bold flex-shrink-0">
                  {getInitials(activeContact.name)}
                </div>
                <div>
                  <p className="font-semibold text-secondary-800 text-sm">{activeContact.name}</p>
                  <p className="text-xs text-secondary-400 capitalize">{activeContact.role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary-50/30">
                {thread.length === 0 && (
                  <p className="text-center text-secondary-400 text-sm py-8">No messages yet. Say hello!</p>
                )}
                {thread.map((msg) => {
                  const mine = String(msg.senderId?._id || msg.senderId) === String(user?._id);
                  return (
                    <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                        mine
                          ? 'bg-primary-500 text-white rounded-br-sm'
                          : 'bg-white text-secondary-800 rounded-bl-sm border border-secondary-100'
                      }`}>
                        <p>{msg.content}</p>
                        <p className={`text-xs mt-1 ${mine ? 'text-primary-200' : 'text-secondary-400'}`}>
                          {formatDateTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-secondary-100 flex gap-2 bg-white">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type a message…"
                  className="input-field flex-1 py-2 text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !text.trim()}
                  className="btn-primary px-4 disabled:opacity-50"
                >
                  <FiSend size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Picker — teacher sees students in their classes, parents of those students, admins */}
      <UserPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handlePickUser}
        title="New Message — Select Recipient"
      />
    </div>
  );
}
