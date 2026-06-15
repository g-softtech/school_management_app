import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUsers, FiBook, FiBarChart2, FiSearch, FiTrendingUp, FiAward, FiAlertCircle } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import ChartCard, { CustomTooltip } from '../../components/common/ChartCard';
import PageSkeleton, { ListItem } from '../../components/common/PageSkeleton';
import { TERMS, SESSIONS } from '../../utils/constants';
import { getErrorMessage } from '../../utils/helpers';

export default function TeacherMyClasses() {
  const [subjects, setSubjects]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState(null);
  const [analytics, setAnalytics]         = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [search, setSearch]               = useState('');
  const [term, setTerm]                   = useState('first');
  const [session, setSession]             = useState('2025/2026');

  useEffect(() => {
    setLoading(true);
    api.get('/subjects', { params: { limit: 100 } })
      .then((r) => setSubjects(r.data.data || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const openAnalytics = async (subject) => {
    if (!subject.classId) { toast.error('No class assigned to this subject'); return; }
    setSelected(subject);
    setAnalytics(null);
    setLoadingAnalytics(true);
    try {
      const classId = subject.classId?._id || subject.classId;
      const res = await api.get(`/analytics/class/${classId}`, { params: { term, session } });
      setAnalytics(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setLoadingAnalytics(false); }
  };

  // Group by class
  const grouped = subjects
    .filter((s) => !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.classId?.name?.toLowerCase().includes(search.toLowerCase())
    )
    .reduce((acc, s) => {
      const key   = s.classId ? (s.classId._id || s.classId) : 'unassigned';
      const label = s.classId ? `${s.classId.name} ${s.classId.section || ''}`.trim() : 'No Class';
      if (!acc[key]) acc[key] = { label, subjects: [] };
      acc[key].subjects.push(s);
      return acc;
    }, {});

  const barData        = analytics?.subjectAverages?.map((s) => ({ name: s.subjectName, avg: s.avgScore })) || [];
  const rankingEntries = analytics?.studentRankings || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">My Classes</h1>
        <p className="page-subtitle">View your assigned subjects and class performance</p>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-0 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400" size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject or class…" className="input-field pl-9 py-1.5 text-sm w-full" />
        </div>
        <select value={term} onChange={(e) => setTerm(e.target.value)} className="input-field py-1.5 text-sm w-32">
          {TERMS.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Term</option>)}
        </select>
        <select value={session} onChange={(e) => setSession(e.target.value)} className="input-field py-1.5 text-sm w-32">
          {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Subject cards */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-4 bg-secondary-100 rounded w-24 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="card animate-pulse h-36" />)}
          </div>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-16 text-secondary-400">
          <FiBook size={32} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No subjects assigned yet</p>
          <p className="text-xs mt-1">Contact admin to assign subjects to your account</p>
        </div>
      ) : (
        Object.entries(grouped).map(([key, group]) => (
          <div key={key} className="space-y-3">
            <h3 className="text-sm font-semibold text-secondary-600 uppercase tracking-wide flex items-center gap-2">
              <FiUsers size={13} className="text-primary-500" /> {group.label}
              <span className="text-xs font-normal text-secondary-400 normal-case">({group.subjects.length} subject{group.subjects.length !== 1 ? 's' : ''})</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.subjects.map((subject) => (
                <div key={subject._id} className="card hover:shadow-card-md transition-all duration-200 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-500 flex items-center justify-center flex-shrink-0 transition-colors duration-200">
                      <FiBook className="text-primary-500 group-hover:text-white transition-colors duration-200" size={18} />
                    </div>
                    <span className="text-xs bg-secondary-100 text-secondary-600 px-2 py-0.5 rounded-full font-mono">{subject.code}</span>
                  </div>
                  <div className="mt-3">
                    <p className="font-semibold text-secondary-800">{subject.name}</p>
                    <p className="text-sm text-secondary-500 mt-0.5">{group.label}</p>
                  </div>
                  <button
                    onClick={() => openAnalytics(subject)}
                    className="mt-4 w-full btn-secondary text-xs flex items-center justify-center gap-2 py-2 hover:btn-primary transition-all"
                  >
                    <FiBarChart2 size={13} /> View Performance
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Analytics Modal */}
      <Modal
        isOpen={!!selected}
        onClose={() => { setSelected(null); setAnalytics(null); }}
        title={`Performance — ${selected?.name || ''} · ${selected?.classId?.name || ''}`}
        size="lg"
      >
        {loadingAnalytics ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-secondary-50 rounded-xl animate-pulse" />)}
            </div>
            <div className="h-48 bg-secondary-50 rounded-xl animate-pulse" />
          </div>
        ) : analytics ? (
          <div className="space-y-5">
            {/* Term/session note */}
            <p className="text-xs text-secondary-400 flex items-center gap-1.5">
              <FiTrendingUp size={12} className="text-primary-500" />
              {term.charAt(0).toUpperCase() + term.slice(1)} Term · {session}
            </p>

            {/* Overview tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Students',  value: analytics.overview?.enrolledStudents, color: 'text-secondary-800' },
                { label: 'Avg Score', value: `${analytics.overview?.averageScore ?? 0}%`, color: 'text-blue-600' },
                { label: 'Pass Rate', value: `${analytics.overview?.passRate ?? 0}%`, color: 'text-green-600' },
                { label: 'Highest',   value: analytics.overview?.highestScore ?? '—', color: 'text-primary-600' },
                { label: 'Lowest',    value: analytics.overview?.lowestScore  ?? '—', color: 'text-red-500' },
              ].map((s) => (
                <div key={s.label} className="text-center p-3 bg-secondary-50 rounded-xl">
                  <p className="text-xs text-secondary-500 mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Subject averages bar chart */}
            {barData.length > 0 && (
              <ChartCard title="Subject Averages" isEmpty={false}>
                <ResponsiveContainer width="100%" height={280} >
                  <BarChart data={barData} margin={{ left: -20, right: 10, bottom: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip formatter={(v) => [`${v}`, 'Avg Score']} />} />
                    <Bar dataKey="avg" name="Avg Score" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.avg >= 50 ? '#C9A227' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Student rankings */}
            {rankingEntries.length > 0 && (
              <div>
                <p className="section-title mb-3">Student Rankings</p>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {rankingEntries.map((s) => (
                    <div key={s._id} className="flex items-center gap-3 p-2.5 bg-secondary-50 rounded-xl">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        s.position === 1 ? 'bg-yellow-400 text-white' :
                        s.position === 2 ? 'bg-secondary-400 text-white' :
                        s.position === 3 ? 'bg-amber-600 text-white' :
                        'bg-secondary-200 text-secondary-600'
                      }`}>
                        {s.position}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-secondary-800 truncate">{s.studentName || '—'}</p>
                        <p className="text-xs text-secondary-400">{s.admissionNumber}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-secondary-800">{s.avgScore}%</p>
                        <p className={`text-xs font-medium ${s.avgScore >= 50 ? 'text-green-600' : 'text-red-500'}`}>
                          {s.avgScore >= 50 ? 'Pass' : 'Fail'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-secondary-400">
            <FiBarChart2 size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No analytics data available</p>
            <p className="text-xs mt-1">Upload results for this term to see performance data</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
