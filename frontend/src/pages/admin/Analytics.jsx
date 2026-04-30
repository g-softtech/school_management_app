import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, CartesianGrid, Legend,
} from 'recharts';
import { FiTrendingUp, FiUsers, FiAward, FiCreditCard } from 'react-icons/fi';
import { getSchoolAnalytics, getPaymentAnalytics } from '../../services/analyticsService';
import ChartCard, { CustomTooltip, exportCSV } from '../../components/common/ChartCard';
import PageSkeleton from '../../components/common/PageSkeleton';
import { formatCurrency } from '../../utils/helpers';
import { TERMS, SESSIONS } from '../../utils/constants';

const COLORS   = ['#C9A227', '#1F2937', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4'];
const GRADE_COLORS = { A1:'#10b981', B2:'#10b981', B3:'#10b981', C4:'#3b82f6', C5:'#3b82f6', C6:'#3b82f6', D7:'#f59e0b', E8:'#f59e0b', F9:'#ef4444' };

function StatTile({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className={color} />
      </div>
      <div>
        <p className="text-xs text-secondary-500">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [school,   setSchool]   = useState(null);
  const [payments, setPayments] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [term,    setTerm]      = useState('first');
  const [session, setSession]   = useState('2025/2026');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getSchoolAnalytics({ term, session }),
      getPaymentAnalytics({ session }),
    ])
      .then(([sr, pr]) => { setSchool(sr.data.data); setPayments(pr.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [term, session]);

  const subjectData  = school?.academic?.subjectPerformance || [];
  const gradeData    = school?.academic?.gradeDistribution  || [];
  const feeTypeData  = payments?.revenueByFeeType           || [];
  const termRevData  = payments?.revenueByTerm              || [];

  if (loading) return <PageSkeleton type="dashboard" statCols={4} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">School performance overview</p>
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

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Pass Rate"     value={`${school?.academic?.passRate ?? 0}%`}        icon={FiAward}     color="text-green-600"   bg="bg-green-50"   />
        <StatTile label="Average Score" value={`${school?.academic?.averageScore ?? 0}`}      icon={FiTrendingUp} color="text-blue-600"    bg="bg-blue-50"    />
        <StatTile label="Total Students" value={school?.counts?.students ?? 0}                icon={FiUsers}     color="text-purple-600"  bg="bg-purple-50"  />
        <StatTile label="Total Revenue" value={formatCurrency(payments?.summary?.totalRevenue)} icon={FiCreditCard} color="text-primary-600" bg="bg-primary-50" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Subject Performance"
          subtitle="Average score per subject this term"
          isEmpty={subjectData.length === 0}
          onExport={() => exportCSV(subjectData.map((s) => ({ Subject: s.subjectName, 'Avg Score': s.avgScore })), 'subject-performance')}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={subjectData.slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 45 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="subjectName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip formatter={(v) => [`${v}`, 'Avg Score']} />} />
              <Bar dataKey="avgScore" name="Avg Score" fill="#C9A227" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Grade Distribution"
          subtitle="How grades are spread across all results"
          isEmpty={gradeData.length === 0}
          onExport={() => exportCSV(gradeData.map((g) => ({ Grade: g._id, Count: g.count })), 'grade-distribution')}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={gradeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip formatter={(v) => [`${v} students`, 'Count']} />} />
              <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {gradeData.map((entry, i) => (
                  <Cell key={i} fill={GRADE_COLORS[entry._id] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Revenue by Fee Type"
          subtitle="Breakdown of collected fees"
          isEmpty={feeTypeData.length === 0}
          emptyMessage="No payment data yet"
          onExport={() => exportCSV(feeTypeData.map((f) => ({ 'Fee Type': f._id, Total: f.total })), 'revenue-by-type')}
        >
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={feeTypeData}
                dataKey="total"
                nameKey="_id"
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={40}
                paddingAngle={3}
                label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {feeTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />} />
              <Legend formatter={(v) => <span className="text-xs text-secondary-600 capitalize">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Revenue by Term"
          subtitle="Fee collection trend across terms"
          isEmpty={termRevData.length === 0}
          emptyMessage="No payment data yet"
          onExport={() => exportCSV(termRevData.map((t) => ({ Term: t._id, Revenue: t.total })), 'revenue-by-term')}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={termRevData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip formatter={(v) => [formatCurrency(v), 'Revenue']} />} />
              <Bar dataKey="total" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Class comparison */}
      {school?.classPerformance?.length > 0 && (
        <ChartCard
          title="Class Performance Comparison"
          subtitle="Average scores across all classes"
          onExport={() => exportCSV(school.classPerformance.map((c) => ({ Class: c.className, 'Avg Score': c.avgScore, 'Pass Rate': `${c.passRate}%` })), 'class-comparison')}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={school.classPerformance} margin={{ top: 5, right: 10, left: -10, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="className" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip formatter={(v, n) => [`${v}`, n]} />} />
              <Legend />
              <Bar dataKey="avgScore"  name="Avg Score"  fill="#C9A227" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="passRate"  name="Pass Rate %" fill="#1F2937" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
