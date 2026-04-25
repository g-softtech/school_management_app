import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUpload, FiSearch } from 'react-icons/fi';
import Table from '../../components/common/Table';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import api from '../../services/api';
import { getErrorMessage } from '../../utils/helpers';
import { TERMS, SESSIONS } from '../../utils/constants';

const GRADE_COLOR = { A1:'success', B2:'success', B3:'success', C4:'info', C5:'info', C6:'info', D7:'warning', E8:'warning', F9:'danger' };

export default function TeacherResults() {
  const [subjects, setSubjects]   = useState([]);
  const [students, setStudents]   = useState([]);
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [classId, setClassId]     = useState('');
  const [term, setTerm]           = useState('first');
  const [session, setSession]     = useState('2025/2026');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({ studentId: '', subjectId: '', classId: '', ca: '', exam: '', term: 'first', session: '2025/2026' });

  useEffect(() => {
    api.get('/subjects', { params: { limit: 50 } }).then((r) => setSubjects(r.data.data)).catch(() => {});
  }, []);

  const classMap = {};
  subjects.forEach((s) => { if (s.classId) classMap[s.classId._id] = s.classId; });
  const myClasses = Object.values(classMap);
  const filteredSubjects = classId ? subjects.filter(s => s.classId?._id === classId) : subjects;

  const handleSearch = async () => {
    if (!classId) { toast.error('Please select a class'); return; }
    setLoading(true);
    try {
      const [rr, sr] = await Promise.all([
        api.get(`/results/class/${classId}`, { params: { term, session } }),
        api.get(`/classes/${classId}/students`),
      ]);
      setResults(rr.data.data);
      setStudents(sr.data.data);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setLoading(false); }
  };

  const openUpload = () => {
    setForm(f => ({ ...f, classId, term, session }));
    setShowModal(true);
  };

  const handleUpload = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/results', { ...form, ca: Number(form.ca), exam: Number(form.exam) });
      toast.success('Result uploaded'); setShowModal(false); handleSearch();
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const columns = [
    { key: 'admissionNumber', label: 'Adm. No' },
    { key: 'subjects', label: 'Subjects', render: (v) => <Badge variant="info">{v?.length ?? 0}</Badge> },
    { key: 'average',  label: 'Average',  render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'position', label: 'Position', render: (v) => v ? `${v}${[,'st','nd','rd'][v] || 'th'}` : '—' },
    { key: 'passCount', label: 'Passed', render: (v, row) => <Badge variant="success">{v}/{row.subjects?.length}</Badge> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="page-title">Results</h1><p className="page-subtitle">Upload and view class results</p></div>
        <button onClick={openUpload} disabled={!classId} className="btn-primary"><FiUpload size={16} />Upload Result</button>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="input-label">Class *</label>
            <select className="input-field py-1.5 text-sm w-40" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— Select Class —</option>
              {myClasses.map((c) => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
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

      {results.length > 0
        ? <Table columns={columns} data={results} loading={loading} emptyMessage="No results found" />
        : <div className="card text-center py-12 text-secondary-400 text-sm">Select a class and click Search to view results.</div>
      }

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
            <div><label className="input-label">CA (0–40) *</label><input type="number" min="0" max="40" className="input-field" value={form.ca} onChange={(e) => setForm({ ...form, ca: e.target.value })} required /></div>
            <div><label className="input-label">Exam (0–60) *</label><input type="number" min="0" max="60" className="input-field" value={form.exam} onChange={(e) => setForm({ ...form, exam: e.target.value })} required /></div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}