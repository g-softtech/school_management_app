import { useEffect, useState } from 'react';
import { FiUsers, FiUserCheck, FiBook, FiCreditCard, FiAward, FiTrendingUp } from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import StatCard from '../../components/common/StatCard';
import ChartCard, { CustomTooltip, exportCSV } from '../../components/common/ChartCard';
import PageSkeleton from '../../components/common/PageSkeleton';
import { getSchoolAnalytics } from '../../services/analyticsService';
import { formatCurrency } from '../../utils/helpers';
import { TERMS, SESSIONS } from '../../utils/constants';

const COLORS      = ['#C9A227', '#1F2937', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];
const GRADE_COLORS = { A1:'#10b981', B2:'#10b981', B3:'#10b981', C4:'#3b82f6', C5:'#3b82f6', C6:'#3b82f6', D7:'#f59e0b', E8:'#f59e0b', F9:'#ef4444' };

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [term,    setTerm]    = useState('first');
  const [session, setSession] = useState('2025/2026');

  useEffect(() => {
    setLoading(true);
    getSchoolAnalytics({ term, session })
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [term, session]);

  const subjectData = data?.academic?.subjectPerformance || [];
  const gradeData   = data?.academic?.gradeDistribution  || [];

  if (loading) return <PageSkeleton type="dashboard" statCols={6} />;

  return (
    <div className="space-y-6">
      {/* Header */}
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Students" value={data?.counts?.students    ?? 0} icon={FiUsers}      color="blue"    />
        <StatCard title="Total Teachers" value={data?.counts?.teachers    ?? 0} icon={FiUserCheck}  color="green"   />
        <StatCard title="Total Classes"  value={data?.counts?.classes     ?? 0} icon={FiBook}       color="purple"  />
        <StatCard title="Pass Rate"      value={`${data?.academic?.passRate ?? 0}%`} icon={FiAward} color="primary" />
        <StatCard title="Avg Score"      value={data?.academic?.averageScore ?? 0}   icon={FiTrendingUp} color="orange" />
        <StatCard title="Total Revenue"  value={formatCurrency(data?.financial?.totalRevenue)} icon={FiCreditCard} color="green" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Subject Performance"
          subtitle="Average score per subject"
          isEmpty={subjectData.length === 0}
          emptyMessage="No results recorded yet"
          onExport={() => exportCSV(
            subjectData.map((s) => ({ Subject: s.subjectName, 'Avg Score': s.avgScore })),
            'subject-performance'
          )}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={subjectData.slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="subjectName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip formatter={(v) => [`${v}`, 'Avg Score']} />} />
              <Bar dataKey="avgScore" name="Avg Score" fill="#C9A227" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Grade Distribution"
          subtitle="Spread of grades across all results"
          isEmpty={gradeData.length === 0}
          emptyMessage="No results recorded yet"
          onExport={() => exportCSV(
            gradeData.map((g) => ({ Grade: g._id, Count: g.count })),
            'grade-distribution'
          )}
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={gradeData}
                dataKey="count"
                nameKey="_id"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={35}
                paddingAngle={3}
                label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {gradeData.map((entry, i) => (
                  <Cell key={i} fill={GRADE_COLORS[entry._id] || COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip formatter={(v) => [`${v} students`, 'Count']} />} />
              <Legend formatter={(v) => <span className="text-xs text-secondary-600">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Academic highlights + Recent payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h3 className="section-title">Academic Highlights</h3>
          {data?.academic?.bestSubject ? (
            <>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
                <div>
                  <p className="text-xs text-green-600 font-semibold">🏆 Best Subject</p>
                  <p className="text-sm font-semibold text-secondary-800 mt-0.5">{data.academic.bestSubject.subjectName}</p>
                </div>
                <span className="text-green-700 font-bold text-xl">{data.academic.bestSubject.avgScore}</span>
              </div>
              {data.academic?.worstSubject?.subjectName !== data.academic.bestSubject?.subjectName && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="text-xs text-red-500 font-semibold">⚠️ Needs Attention</p>
                    <p className="text-sm font-semibold text-secondary-800 mt-0.5">{data.academic.worstSubject?.subjectName}</p>
                  </div>
                  <span className="text-red-600 font-bold text-xl">{data.academic.worstSubject?.avgScore}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: 'Total Exams', value: data.academic?.totalExams   ?? 0, color: 'text-secondary-800' },
                  { label: 'Passed',      value: data.academic?.totalPassed  ?? 0, color: 'text-green-600' },
                  { label: 'Failed',      value: data.academic?.totalFailed  ?? 0, color: 'text-red-500' },
                ].map((s) => (
                  <div key={s.label} className="p-3 bg-secondary-50 rounded-xl text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-secondary-500 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-secondary-400">
              <FiAward size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No results recorded yet</p>
            </div>
          )}
        </div>

        <div className="card space-y-3">
          <h3 className="section-title">Recent Payments</h3>
          {data?.financial?.recentPayments?.length > 0 ? (
            <div className="space-y-2.5">
              {data.financial.recentPayments.map((p) => (
                <div key={p._id} className="flex items-center justify-between p-2.5 bg-secondary-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-secondary-800">
                      {p.studentId?.userId?.name || p.studentId?.admissionNumber || '—'}
                    </p>
                    <p className="text-xs text-secondary-400 capitalize">{p.feeType} · {p.term} term</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-secondary-400 capitalize">{p.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-secondary-400">
              <FiCreditCard size={28} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No payments recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
