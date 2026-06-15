import { useState, useRef, useEffect, useCallback } from 'react';
import { FiCpu, FiX, FiSend, FiMinimize2, FiMaximize2, FiTrash2 } from 'react-icons/fi';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../utils/helpers';

const ROLE_HINTS = {
  student: [
    'What is my best subject?',
    'Which subject did I fail?',
    'How can I improve my grades?',
  ],
  teacher: [
    'Generate a lesson plan for JSS 2 Mathematics',
    'Suggest teaching methods for weak students',
    'What topics should I cover this term?',
  ],
  admin: [
    'How do I improve school pass rate?',
    'Suggest strategies for parent engagement',
    'What analytics should I track?',
  ],
  parent: [
    "How can I support my child's learning?",
    'What subjects need more attention?',
    'Tips for monitoring academic progress?',
  ],
};

const WELCOME = {
  student: "Hello! I'm your SmartSchool AI. Ask me about your results, subjects, or study tips!",
  teacher: "Hello! I'm your SmartSchool AI. I can help with lesson plans, teaching strategies, or class insights.",
  admin:   "Hello! I'm your SmartSchool AI. I can help with school management insights and strategies.",
  parent:  "Hello! I'm your SmartSchool AI. I can help you support your child's academic journey.",
};

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
          <FiCpu size={13} className="text-white" />
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-primary-500 text-white rounded-br-sm'
            : 'bg-secondary-100 text-secondary-800 rounded-bl-sm'
        }`}
      >
        {/* Render newlines */}
        {msg.content.split('\n').map((line, i) => (
          <span key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</span>
        ))}
      </div>
    </div>
  );
}

export default function SmartAssistant() {
  const { user } = useAuth();
  const [open, setOpen]         = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const hints = ROLE_HINTS[user?.role] || [];
  const welcome = WELCOME[user?.role] || "Hello! I'm your SmartSchool AI assistant.";

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Set welcome message on first open
  const handleOpen = () => {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: welcome }]);
    }
  };

  const sendMessage = useCallback(async (text) => {
    const query = text || input.trim();
    if (!query || loading) return;

    setMessages((prev) => [...prev, { role: 'user', content: query }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/assistant', { query });
      setMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I couldn't process that. ${getErrorMessage(err)}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: welcome }]);
  };

  if (!user) return null;

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary-500 hover:bg-primary-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
          title="AI Assistant"
        >
          <FiCpu size={22} />
          <span className="absolute -top-8 right-0 bg-secondary-800 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI Assistant
          </span>
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div
          className={`fixed z-40 bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-secondary-100 flex flex-col transition-all duration-200 ${
            expanded ? 'w-full max-w-full h-[600px]' : 'w-80 h-[460px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-secondary-800 to-secondary-700 rounded-t-2xl flex-shrink-0">
            <div className="w-8 h-8 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <FiCpu size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">SmartSchool AI</p>
              <p className="text-secondary-400 text-xs capitalize">{user?.role} assistant</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 hover:bg-secondary-700 rounded-lg transition-colors text-secondary-400 hover:text-white"
                title="Clear chat"
              >
                <FiTrash2 size={13} />
              </button>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="p-1.5 hover:bg-secondary-700 rounded-lg transition-colors text-secondary-400 hover:text-white"
                title={expanded ? 'Minimize' : 'Expand'}
              >
                {expanded ? <FiMinimize2 size={13} /> : <FiMaximize2 size={13} />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 hover:bg-secondary-700 rounded-lg transition-colors text-secondary-400 hover:text-white"
                title="Close"
              >
                <FiX size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 min-w-0 overflow-y-auto px-4 py-3">
            {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

            {/* Loading dots */}
            {loading && (
              <div className="flex justify-start mb-3">
                <div className="w-7 h-7 rounded-xl bg-primary-500 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <FiCpu size={13} className="text-white" />
                </div>
                <div className="bg-secondary-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-secondary-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Hints (show when only welcome message) */}
          {messages.length === 1 && hints.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {hints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(hint)}
                  className="text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 px-2.5 py-1.5 rounded-full transition-colors text-left"
                >
                  {hint}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-secondary-100 flex gap-2 flex-shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything…"
              rows={1}
              className="input-field flex-1 min-w-0 py-2 text-sm resize-none overflow-hidden min-h-[36px] max-h-24"
              style={{ height: 'auto' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="btn-primary px-3 h-9 self-end disabled:opacity-40"
            >
              <FiSend size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
