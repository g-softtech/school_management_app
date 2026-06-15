import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiUser, FiAward, FiCreditCard, FiMessageSquare,
  FiTrendingUp, FiAlertCircle, FiCheckCircle, FiCalendar,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getStudentPayments } from '../../services/paymentService';
import { getStudentResults } from '../../services/resultService';
import { formatCurrency, formatDate } from '../../utils/helpers';
import PageSkeleton from '../../components/common/PageSkeleton';
import { TERMS, SESSIONS } from '../../utils/constants';

export default function ParentDashboard() {
  const { user } = useAuth();
  const [child, setChild]       = useState(null);
  const [results, setResults]   = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary]   = useState(null);
  const [unread, setUnread]     = useState(0);
  const [loading, setLoading]   = useState(true);
  const [term, setTerm]         = useState('first');
  const [session, setSession]   = useState('2025/2026');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const childRes = await api.get('/students/my-child');
        const c = childRes.data.data;
        setChild(c);

        const [resRes, payRes, unreadRes] = await Promise.allSettled([
          getStudentResults(c._id, { term, session }),
          getStudentPayments(c._id, { session, limit: 5 }),
          api.get('/messages/unread-count'),
        ]);

        if (resRes.status === 'fulfilled') {
          setResults(resRes.value.data.data || []);
          setSummary(resRes.value.data.summary);
        }
        if (payRes.status === 'fulfilled') {
          setPayments(payRes.value.data.data || []);
        }
        if (unreadRes.status === 'fulfilled') {
          setUnread(unreadRes.value.data.count || 0);
        }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [term, session]);

  const passed  = results.filter((r) => ['A1','B2','B3','C4','C5','C6'].includes(r.grade)).length;
  const average = results.length
    ? (results.reduce((s, r) => s + r.total, 0) / results.length).toFixed(1)
    : 0;

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Monitor your child's academic progress</p>
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

      {/* Child profile card */}
      {loading ? (
        <div className="card animate-pulse h-24" />
      ) : child ? (
        <div className="card bg-gradient-to-r from-secondary-800 to-secondary-700 text-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {child.userId?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight">{child.userId?.name}</p>
              <p className="text-secondary-300 text-sm">{child.admissionNumber}</p>
              <p className="text-secondary-400 text-xs mt-0.5">
                {child.classId?.name} {child.classId?.section} · {child.gender}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-secondary-400">Date of Birth</p>
              <p className="text-sm text-white">{formatDate(child.dateOfBirth)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-10 text-secondary-400">
          <FiUser size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium text-secondary-600">No child linked to your account</p>
          <p className="text-sm mt-1">Please contact the school admin to link your child.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Average Score', value: `${average}%`, icon: FiTrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Subjects Passed', value: passed, icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Subjects Failed', value: results.length - passed, icon: FiAlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Unread Messages', value: unread, icon: FiMessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((s) => (
          <div key={s.label} className="card flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={s.color} size={18} />
            </div>
            <div>
              <p className="text-xs text-secondary-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Results */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="section-title flex items-center gap-2"><FiAward size={15} className="text-primary-500" /> Recent Results</h3>
            <Link to="/parent/results" className="text-xs text-primary-500 hover:underline font-medium">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-secondary-50 rounded-lg animate-pulse" />)}</div>
          ) : results.length === 0 ? (
            <p className="text-secondary-400 text-sm text-center py-6">No results for this term</p>
          ) : (
            <>
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
                        {r.grade}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <div className="text-center p-2 bg-secondary-50 rounded-xl">
                    <p className="text-lg font-bold text-secondary-800">{summary.totalSubjects}</p>
                    <p className="text-xs text-secondary-400">Subjects</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-xl">
                    <p className="text-lg font-bold text-green-600">{summary.passed}</p>
                    <p className="text-xs text-secondary-400">Passed</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-xl">
                    <p className="text-lg font-bold text-red-500">{summary.failed}</p>
                    <p className="text-xs text-secondary-400">Failed</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Recent Payments */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="section-title flex items-center gap-2"><FiCreditCard size={15} className="text-primary-500" /> Fee Payments</h3>
            <Link to="/parent/payments" className="text-xs text-primary-500 hover:underline font-medium">View all</Link>
          </div>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-secondary-50 rounded-lg animate-pulse" />)}</div>
          ) : (
            <>
              <div className="p-3 bg-primary-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary-600 font-medium">Total Paid This Session</p>
                  <p className="text-xl font-bold text-primary-700">{formatCurrency(totalPaid)}</p>
                </div>
                <FiCreditCard className="text-primary-400" size={24} />
              </div>
              {payments.length === 0 ? (
                <p className="text-secondary-400 text-sm text-center py-4">No payment records</p>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 4).map((p) => (
                    <div key={p._id} className="flex items-center justify-between p-2.5 bg-secondary-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-secondary-800 capitalize">{p.feeType}</p>
                        <p className="text-xs text-secondary-400">{p.term} term · {formatDate(p.paidAt || p.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-secondary-800">{formatCurrency(p.amount)}</p>
                        <span className={`text-xs font-medium ${p.status === 'paid' ? 'text-green-600' : p.status === 'pending' ? 'text-amber-600' : 'text-red-500'}`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Quick links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-secondary-100">
            {[
              { to: '/parent/results',  icon: FiAward, label: "Child's Results" },
              { to: '/parent/messages', icon: FiMessageSquare, label: 'Messages' },
            ].map((link) => (
              <Link key={link.to} to={link.to} className="flex items-center gap-2 p-2.5 bg-secondary-50 hover:bg-secondary-100 rounded-xl transition-colors">
                <link.icon size={15} className="text-secondary-600" />
                <span className="text-xs text-secondary-600 font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
