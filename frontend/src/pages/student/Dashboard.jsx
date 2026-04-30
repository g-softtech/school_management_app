import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiAward, FiFileText, FiClipboard, FiMessageSquare, FiTrendingUp, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { TERMS, SESSIONS } from '../../utils/constants';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent]     = useState(null);
  const [results, setResults]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [unread, setUnread]       = useState(0);
  const [loading, setLoading]     = useState(true);
  const [term, setTerm]           = useState('first');
  const [session, setSession]     = useState('2025/2026');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Get student profile
        const stuRes = await api.get('/students/me');
        const stu = stuRes.data.data;
        setStudent(stu);

        // Get results + messages unread in parallel
        const [resRes, asgRes, unreadRes] = await Promise.allSettled([
          api.get(`/results/student/${stu._id}`, { params: { term, session } }),
          api.get('/assignments', { params: { term, session, limit: 5 } }),
          api.get('/messages/unread-count'),
        ]);

        if (resRes.status === 'fulfilled') setResults(resRes.value.data.data || []);
        if (asgRes.status === 'fulfilled') setAssignments(asgRes.value.data.data || []);
        if (unreadRes.status === 'fulfilled') setUnread(unreadRes.value.data.count || 0);
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [term, session]);

  const passed  = results.filter((r) => ['A1','B2','B3','C4','C5','C6'].includes(r.grade)).length;
  const failed  = results.length - passed;
  const average = results.length > 0
    ? (results.reduce((s, r) => s + r.total, 0) / results.length).toFixed(1)
    : 0;
  const bestResult  = results.reduce((best, r) => (!best || r.total > best.total ? r : best), null);
  const worstResult = results.reduce((worst, r) => (!worst || r.total < worst.total ? r : worst), null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's your academic overview</p>
        </div>
        <div className="flex gap-2">
          <select value={term} onChange={(e) => setTerm(e.target.value)} className="input-field py-1.5 text-sm w-32">
            {TERMS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Term</option>)}
          </select>
          <select value={session} onChange={(e) => setSession(e.target.value)} className="input-field py-1.5 text-sm w-32">
            {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Student info card */}
      {student && (
        <div className="card bg-gradient-to-r from-secondary-800 to-secondary-700 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0,2)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-lg leading-tight">{user?.name}</p>
              <p className="text-secondary-300 text-sm">{student.admissionNumber}</p>
              <p className="text-secondary-400 text-xs mt-0.5">{student.classId?.name} {student.classId?.section}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse"><div className="h-16 bg-secondary-100 rounded-xl" /></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Avg Score', value: average, icon: FiTrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Subjects Passed', value: passed, icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Subjects Failed', value: failed, icon: FiAlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Unread Messages', value: unread, icon: FiMessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((s) => (
            <div key={s.label} className="card flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={s.color} size={18} />
              </div>
              <div>
                <p className="text-xs text-secondary-500">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Results */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Recent Results</h3>
            <Link to="/student/results" className="text-xs text-primary-500 hover:underline font-medium">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-secondary-50 rounded-lg animate-pulse" />)}</div>
          ) : results.length === 0 ? (
            <p className="text-secondary-400 text-sm text-center py-6">No results for this term yet</p>
          ) : (
            <div className="space-y-2">
              {results.slice(0, 5).map((r) => (
                <div key={r._id} className="flex items-center justify-between p-2.5 bg-secondary-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-secondary-800">{r.subjectId?.name || '—'}</p>
                    <p className="text-xs text-secondary-400">CA: {r.ca} · Exam: {r.exam}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-secondary-800">{r.total}/100</p>
                    <span className={`text-xs font-semibold ${['A1','B2','B3','C4','C5','C6'].includes(r.grade) ? 'text-green-600' : 'text-red-500'}`}>
                      {r.grade} · {r.remark}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Highlights */}
          {!loading && results.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {bestResult && (
                <div className="p-2.5 bg-green-50 rounded-xl">
                  <p className="text-xs text-green-600 font-medium">Best Subject</p>
                  <p className="text-sm font-semibold text-secondary-800 truncate">{bestResult.subjectId?.name}</p>
                  <p className="text-xs text-green-700 font-bold">{bestResult.total}/100</p>
                </div>
              )}
              {worstResult && worstResult._id !== bestResult?._id && (
                <div className="p-2.5 bg-red-50 rounded-xl">
                  <p className="text-xs text-red-500 font-medium">Needs Work</p>
                  <p className="text-sm font-semibold text-secondary-800 truncate">{worstResult.subjectId?.name}</p>
                  <p className="text-xs text-red-600 font-bold">{worstResult.total}/100</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Assignments */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="section-title">Assignments</h3>
            <Link to="/student/assignments" className="text-xs text-primary-500 hover:underline font-medium">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-secondary-50 rounded-lg animate-pulse" />)}</div>
          ) : assignments.length === 0 ? (
            <p className="text-secondary-400 text-sm text-center py-6">No assignments yet</p>
          ) : (
            <div className="space-y-2">
              {assignments.slice(0, 5).map((a) => {
                const overdue = new Date() > new Date(a.dueDate);
                return (
                  <div key={a._id} className="flex items-center justify-between p-2.5 bg-secondary-50 rounded-xl">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-secondary-800 truncate">{a.title}</p>
                      <p className="text-xs text-secondary-400">{a.subjectId?.name} · {a.maxScore} marks</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${overdue ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                      {overdue ? 'Overdue' : 'Open'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-secondary-100">
            {[
              { to: '/student/lesson-notes', icon: FiFileText, label: 'Notes' },
              { to: '/student/analytics',    icon: FiTrendingUp, label: 'Progress' },
              { to: '/student/messages',     icon: FiMessageSquare, label: 'Messages' },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="flex flex-col items-center gap-1 p-2.5 bg-secondary-50 hover:bg-secondary-100 rounded-xl transition-colors">
                <link.icon size={16} className="text-secondary-600" />
                <span className="text-xs text-secondary-600 font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
