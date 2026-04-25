import { useEffect, useState } from 'react';
import { FiUsers, FiUserCheck, FiBook, FiCreditCard, FiAward, FiTrendingUp } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import StatCard from '../../components/common/StatCard';
import { getSchoolAnalytics } from '../../services/analyticsService';
import { formatCurrency } from '../../utils/helpers';
import { TERMS, SESSIONS } from '../../utils/constants';

const COLORS = ['#C9A227', '#1F2937', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [term, setTerm]     = useState('first');
  const [session, setSession] = useState('2025/2026');

  useEffect(() => {
    setLoading(true);
    getSchoolAnalytics({ term, session })
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [term, session]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">School Overview</h1>
          <p className="page-subtitle">Welcome back, Admin. Here's what's happening today.</p>
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

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="stat-card animate-pulse">
              <div className="w-12 h-12 bg-secondary-100 rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-secondary-100 rounded w-24" />
                <div className="h-6 bg-secondary-100 rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total Students" value={data?.counts?.students} icon={FiUsers}     color="blue"   />
          <StatCard title="Total Teachers" value={data?.counts?.teachers} icon={FiUserCheck}  color="green"  />
          <StatCard title="Total Classes"  value={data?.counts?.classes}  icon={FiBook}       color="purple" />
          <StatCard title="Pass Rate"      value={`${data?.academic?.passRate ?? 0}%`} icon={FiAward} color="primary" />
          <StatCard title="Avg Score"      value={data?.academic?.averageScore ?? 0} icon={FiTrendingUp} color="orange" />
          <StatCard title="Total Revenue"  value={formatCurrency(data?.financial?.totalRevenue)} icon={FiCreditCard} color="green" />
        </div>
      )}

      {/* Charts row */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Subject performance bar chart */}
          <div className="card">
            <h3 className="section-title">Subject Performance</h3>
            {data.academic?.subjectPerformance?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.academic.subjectPerformance.slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                  <XAxis dataKey="subjectName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip formatter={(v) => [`${v}`, 'Avg Score']} />
                  <Bar dataKey="avgScore" fill="#C9A227" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-secondary-400 text-sm text-center py-10">No result data yet</p>}
          </div>

          {/* Grade distribution pie chart */}
          <div className="card">
            <h3 className="section-title">Grade Distribution</h3>
            {data.academic?.gradeDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={data.academic.gradeDistribution} dataKey="count" nameKey="_id" cx="50%" cy="50%" outerRadius={80} label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}>
                    {data.academic.gradeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-secondary-400 text-sm text-center py-10">No result data yet</p>}
          </div>
        </div>
      )}

      {/* Best/Worst subjects + Recent payments */}
      {!loading && data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card space-y-3">
            <h3 className="section-title">Academic Highlights</h3>
            {data.academic?.bestSubject && (
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl">
                <div>
                  <p className="text-xs text-green-600 font-medium">Best Subject</p>
                  <p className="text-sm font-semibold text-secondary-800">{data.academic.bestSubject.subjectName}</p>
                </div>
                <span className="text-green-700 font-bold text-lg">{data.academic.bestSubject.avgScore}</span>
              </div>
            )}
            {data.academic?.worstSubject && data.academic.worstSubject.subjectName !== data.academic.bestSubject?.subjectName && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                <div>
                  <p className="text-xs text-red-500 font-medium">Needs Attention</p>
                  <p className="text-sm font-semibold text-secondary-800">{data.academic.worstSubject.subjectName}</p>
                </div>
                <span className="text-red-600 font-bold text-lg">{data.academic.worstSubject.avgScore}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-secondary-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-secondary-800">{data.academic?.totalPassed ?? 0}</p>
                <p className="text-xs text-secondary-500 mt-0.5">Passed</p>
              </div>
              <div className="p-3 bg-secondary-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-secondary-800">{data.academic?.totalFailed ?? 0}</p>
                <p className="text-xs text-secondary-500 mt-0.5">Failed</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="section-title">Recent Payments</h3>
            {data.financial?.recentPayments?.length > 0 ? (
              <div className="space-y-3">
                {data.financial.recentPayments.map((p) => (
                  <div key={p._id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-secondary-800">{p.studentId?.admissionNumber || '—'}</p>
                      <p className="text-secondary-400 text-xs capitalize">{p.feeType} · {p.term} term</p>
                    </div>
                    <span className="text-green-600 font-semibold">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-secondary-400 text-sm text-center py-10">No payments yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}