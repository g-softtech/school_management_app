import { useState, useEffect } from 'react';
import { FiUsers } from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import Table from '../../components/common/Table';
import api from '../../services/api';
import { getClassStudents } from '../../services/classService';

export default function TeacherMyClasses() {
  const [subjects, setSubjects]   = useState([]);
  const [students, setStudents]   = useState([]);
  const [activeClass, setActiveClass] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    api.get('/subjects', { params: { limit: 50 } })
      .then((r) => {
        setSubjects(r.data.data);
        // Group by class
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group subjects by classId
  const classMap = {};
  subjects.forEach((s) => {
    const cid = s.classId?._id;
    if (!cid) return;
    if (!classMap[cid]) classMap[cid] = { class: s.classId, subjects: [] };
    classMap[cid].subjects.push(s);
  });
  const classes = Object.values(classMap);

  const loadStudents = async (classId) => {
    setActiveClass(classId);
    setStudentsLoading(true);
    try {
      const res = await getClassStudents(classId);
      setStudents(res.data.data);
    } catch {}
    finally { setStudentsLoading(false); }
  };

  const studentColumns = [
    { key: 'admissionNumber', label: 'Adm. No' },
    { key: 'userId', label: 'Name', render: (v) => v?.name || '—' },
    { key: 'gender', label: 'Gender', render: (v) => <Badge variant={v === 'male' ? 'info' : 'purple'}>{v}</Badge> },
    { key: 'age', label: 'Age' },
    { key: 'isActive', label: 'Status', render: (v) => <Badge variant={v ? 'success' : 'danger'}>{v ? 'Active' : 'Inactive'}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="page-title">My Classes</h1><p className="page-subtitle">Classes and subjects assigned to you</p></div>

      {loading ? <div className="py-12 text-center text-secondary-400">Loading...</div> :
      classes.length === 0 ? <div className="card text-center py-12 text-secondary-400">No classes assigned yet. Contact the admin.</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {classes.map(({ class: cls, subjects: subs }) => (
            <div key={cls._id}
              onClick={() => loadStudents(cls._id)}
              className={`card cursor-pointer transition-all hover:shadow-card-md ${activeClass === cls._id ? 'ring-2 ring-primary-400' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-secondary-800">{cls.name} {cls.section}</p>
                  <p className="text-xs text-secondary-400">{cls.academicYear}</p>
                </div>
                <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center">
                  <FiUsers className="text-primary-600" size={18} />
                </div>
              </div>
              <div className="space-y-1">
                {subs.map((s) => (
                  <div key={s._id} className="flex items-center justify-between text-xs">
                    <span className="text-secondary-600">{s.name}</span>
                    <Badge variant="gold">{s.code}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-primary-600 mt-3 font-medium">Click to view students →</p>
            </div>
          ))}
        </div>
      )}

      {activeClass && (
        <div className="card">
          <h3 className="section-title">Students in {classes.find(c => c.class._id === activeClass)?.class?.name} {classes.find(c => c.class._id === activeClass)?.class?.section}</h3>
          <Table columns={studentColumns} data={students} loading={studentsLoading} emptyMessage="No students enrolled" />
        </div>
      )}
    </div>
  );
}