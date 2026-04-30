import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUpload, FiSearch, FiFileText } from 'react-icons/fi';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import { getStudents } from '../../services/studentService';
import { getClasses } from '../../services/classService';
import { getSubjects } from '../../services/subjectService';
import { getClassResults, uploadResult } from '../../services/resultService';
import { getErrorMessage } from '../../utils/helpers';
import { generateClassReportCard } from '../../utils/reportCardHelper';
import { TERMS, SESSIONS } from '../../utils/constants';

const GRADE_COLORS = { A1:'success', B2:'success', B3:'success', C4:'info', C5:'info', C6:'info', D7:'warning', E8:'warning', F9:'danger' };

export default function AdminResults() {
  const [classes, setClasses]   = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [classId, setClassId]   = useState('');
  const [term, setTerm]         = useState('first');
  const [session, setSession]   = useState('2025/2026');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ studentId: '', subjectId: '', classId: '', ca: '', exam: '', term: 'first', session: '2025/2026' });
  const [students, setStudents] = useState([]);

  useEffect(() => {
    Promise.all([getClasses({ limit: 100 }), getSubjects({ limit: 100 })]).then(([cr, sr]) => {
      setClasses(cr.data.data);
      setSubjects(sr.data.data);
    });
  }, []);

  const handleSearch = async () => {
    if (!classId || !term || !session) { toast.error('Please select class, term and session'); return; }
    setLoading(true);
    try {
      const res = await getClassResults(classId, { term, session });
      setResults(res.data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await uploadResult({ ...form, ca: Number(form.ca), exam: Number(form.exam) });
      toast.success('Result uploaded'); setShowModal(false); handleSearch();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const openUpload = async () => {
    if (classId) {
      const res = await getStudents({ classId, limit: 100 });
      setStudents(res.data.data);
      setForm((f) => ({ ...f, classId, term, session }));
    }
    setShowModal(true);
  };

  const filteredSubjects = subjects.filter((s) => s.classId?._id === classId || s.classId === classId);

  const columns = [
    { key: 'admissionNumber', label: 'Adm. No' },
    { key: 'subjects', label: 'Subjects', render: (v) => <Badge variant="info">{v?.length ?? 0}</Badge> },
    { key: 'average',  label: 'Average', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'position', label: 'Position', render: (v) => v ? `${v}${v === 1 ? 'st' : v === 2 ? 'nd' : v === 3 ? 'rd' : 'th'}` : '—' },
    { key: 'passCount', label: 'Passed', render: (v, row) => <Badge variant="success">{v}/{row.subjects?.length}</Badge> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h1 className="page-title">Results Management</h1></div>
        <div className="flex gap-2">
          {results.length > 0 && (
            <button
              onClick={() => {
                const byStudent = results.reduce((acc, r) => {
                  const sid  = r.studentId?._id || r.studentId;
                  const name = r.studentId?.userId?.name || 'Unknown';
                  const admNo = r.studentId?.admissionNumber || '';
                  if (!acc[sid]) acc[sid] = { name, admissionNumber: admNo, results: [] };
                  acc[sid].results.push({ subjectName: r.subjectId?.name, ca: r.ca, exam: r.exam, total: r.total, grade: r.grade, remark: r.remark });
                  return acc;
                }, {});
                const cls = classes.find((c) => c._id === classId);
                generateClassReportCard({
                  className: cls ? `${cls.name} ${cls.section || ''}`.trim() : 'Class',
                  students: Object.values(byStudent),
                  term, session,
                });
              }}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <FiFileText size={15} /> Report Cards
            </button>
          )}
          <button onClick={openUpload} className="btn-primary flex items-center gap-2 text-sm">
            <FiUpload size={16} /> Upload Result
          </button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="input-label">Class</label>
            <select className="input-field py-1.5 text-sm w-40" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— Select —</option>
              {classes.map((c) => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
            </select>
          </div>
          <div><label className="input-label">Term</label>
            <select className="input-field py-1.5 text-sm w-32" value={term} onChange={(e) => setTerm(e.target.value)}>
              {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="input-label">Session</label>
            <select className="input-field py-1.5 text-sm w-32" value={session} onChange={(e) => setSession(e.target.value)}>
              {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button onClick={handleSearch} className="btn-primary py-2"><FiSearch size={15} />Search</button>
        </div>
      </div>

      {results.length > 0 ? (
        <Table columns={columns} data={results} loading={loading} emptyMessage="No results found" />
      ) : (
        <div className="card text-center py-12">
          <p className="text-secondary-400 text-sm">Select a class, term and session then click Search to view results.</p>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Upload Result">
        <form onSubmit={handleUpload} className="space-y-4">
          <div><label className="input-label">Student *</label>
            <select className="input-field" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })} required>
              <option value="">— Select Student —</option>
              {students.map((s) => <option key={s._id} value={s._id}>{s.userId?.name} ({s.admissionNumber})</option>)}
            </select>
          </div>
          <div><label className="input-label">Subject *</label>
            <select className="input-field" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
              <option value="">— Select Subject —</option>
              {filteredSubjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">CA Score (0–40) *</label><input type="number" min="0" max="40" className="input-field" value={form.ca} onChange={(e) => setForm({ ...form, ca: e.target.value })} required /></div>
            <div><label className="input-label">Exam Score (0–60) *</label><input type="number" min="0" max="60" className="input-field" value={form.exam} onChange={(e) => setForm({ ...form, exam: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="input-label">Term</label>
              <select className="input-field" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })}>
                {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="input-label">Session</label>
              <select className="input-field" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })}>
                {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Uploading...' : 'Upload Result'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}