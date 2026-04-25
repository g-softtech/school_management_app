import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { getSchoolAnalytics, getPaymentAnalytics } from '../../services/analyticsService';
import { formatCurrency } from '../../utils/helpers';
import { TERMS, SESSIONS } from '../../utils/constants';

const COLORS = ['#C9A227', '#1F2937', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

export default function AdminAnalytics() {
  const [school, setSchool]   = useState(null);
  const [payments, setPayments] = useState(null);
  const [loading, setLoading] = useState(true);
  const [term, setTerm]       = useState('first');
  const [session, setSession] = useState('2025/2026');

  useEffect(() => {
    setLoading(true);
    Promise.all([getSchoolAnalytics({ term, session }), getPaymentAnalytics({ session })])
      .then(([sr, pr]) => { setSchool(sr.data.data); setPayments(pr.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [term, session]);

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="page-title">Analytics</h1><p className="page-subtitle">School performance overview</p></div>
        <div className="flex gap-2">
          <select value={term} onChange={(e) => setTerm(e.target.value)} className="input-field py-1.5 text-sm w-32">
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={session} onChange={(e) => setSession(e.target.value)} className="input-field py-1.5 text-sm w-32">
            {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Academic */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pass Rate', value: `${school?.academic?.passRate ?? 0}%`, color: 'text-green-600' },
          { label: 'Avg Score', value: school?.academic?.averageScore ?? 0, color: 'text-blue-600' },
          { label: 'Total Exams', value: school?.academic?.totalExams ?? 0, color: 'text-secondary-800' },
          { label: 'Total Revenue', value: formatCurrency(school?.financial?.totalRevenue), color: 'text-primary-600' },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-xs text-secondary-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="section-title">Subject Performance</h3>
          {school?.academic?.subjectPerformance?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={school.academic.subjectPerformance.slice(0, 6)} margin={{ left: -20, bottom: 30 }}>
                <XAxis dataKey="subjectName" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="avgScore" fill="#C9A227" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-secondary-400 py-10 text-sm">No data</p>}
        </div>

        <div className="card">
          <h3 className="section-title">Revenue by Fee Type</h3>
          {payments?.revenueByFeeType?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={payments.revenueByFeeType} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={80}
                  label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}>
                  {payments.revenueByFeeType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-secondary-400 py-10 text-sm">No payment data</p>}
        </div>

        <div className="card">
          <h3 className="section-title">Grade Distribution</h3>
          {school?.academic?.gradeDistribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={school.academic.gradeDistribution} margin={{ left: -20 }}>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#1F2937" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-secondary-400 py-10 text-sm">No data</p>}
        </div>

        <div className="card">
          <h3 className="section-title">Revenue by Term</h3>
          {payments?.revenueByTerm?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={payments.revenueByTerm} margin={{ left: 10 }}>
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="total" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-secondary-400 py-10 text-sm">No data</p>}
        </div>
      </div>
    </div>
  );
}