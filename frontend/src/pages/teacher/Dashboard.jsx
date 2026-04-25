import { useState, useEffect } from 'react';
import { FiBook, FiClipboard, FiAward, FiUsers } from 'react-icons/fi';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import api from '../../services/api';
import { formatDate, getErrorMessage } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [subjects, setSubjects]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [sr, ar] = await Promise.all([
          api.get('/subjects', { params: { limit: 20 } }),
          api.get('/assignments', { params: { limit: 5 } }),
        ]);
        setSubjects(sr.data.data);
        setAssignments(ar.data.data);
      } catch {}
      finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const classes = [...new Set(subjects.map((s) => s.classId?._id))].length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Welcome, {user?.name?.split(' ')[0]}</h1>
        <p className="page-subtitle">Here's your teaching overview for today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Subjects"     value={subjects.length} icon={FiBook}      color="primary" />
        <StatCard title="My Classes"      value={classes}          icon={FiUsers}     color="blue"    />
        <StatCard title="Assignments"     value={assignments.length} icon={FiClipboard} color="purple" />
        <StatCard title="Active Today"    value={subjects.filter(s => s.isActive).length} icon={FiAward} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Subjects */}
        <div className="card">
          <h3 className="section-title">My Subjects</h3>
          {loading ? <div className="py-8 text-center text-secondary-400 text-sm">Loading...</div> :
          subjects.length === 0 ? <p className="text-secondary-400 text-sm text-center py-8">No subjects assigned yet</p> :
          <div className="space-y-2">
            {subjects.map((s) => (
              <div key={s._id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-secondary-800">{s.name}</p>
                  <p className="text-xs text-secondary-400">{s.classId?.name} {s.classId?.section}</p>
                </div>
                <Badge variant="gold">{s.code}</Badge>
              </div>
            ))}
          </div>}
        </div>

        {/* Recent Assignments */}
        <div className="card">
          <h3 className="section-title">Recent Assignments</h3>
          {loading ? <div className="py-8 text-center text-secondary-400 text-sm">Loading...</div> :
          assignments.length === 0 ? <p className="text-secondary-400 text-sm text-center py-8">No assignments yet</p> :
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a._id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-secondary-800">{a.title}</p>
                  <p className="text-xs text-secondary-400">{a.subjectId?.name} · Due {formatDate(a.dueDate)}</p>
                </div>
                <Badge variant={new Date() > new Date(a.dueDate) ? 'danger' : 'success'}>
                  {new Date() > new Date(a.dueDate) ? 'Overdue' : 'Active'}
                </Badge>
              </div>
            ))}
          </div>}
        </div>
      </div>
    </div>
  );
}