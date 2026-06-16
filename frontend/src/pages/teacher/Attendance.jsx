import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { FiCheckSquare, FiCalendar, FiSave, FiAlertTriangle, FiRefreshCw, FiUsers, FiClock, FiXCircle, FiCheckCircle } from 'react-icons/fi';
import api from '../../services/api';
import { getStudents } from '../../services/studentService';
import { getAttendance, saveAttendance } from '../../services/attendanceService';
import { getClasses } from '../../services/classService';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { getErrorMessage } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import { TERMS, SESSIONS } from '../../utils/constants';

export default function TeacherAttendance() {
  const { user } = useAuth();
  
  // Controls
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [term, setTerm] = useState('first');
  const [session, setSession] = useState('2025/2026');

  // State
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [isExistingRecord, setIsExistingRecord] = useState(false);

  // Stats
  const stats = useMemo(() => {
    const present = Object.values(attendanceMap).filter(r => r.status === 'present').length;
    const absent = Object.values(attendanceMap).filter(r => r.status === 'absent').length;
    const late = Object.values(attendanceMap).filter(r => r.status === 'late').length;
    const unmarked = Object.values(attendanceMap).filter(r => !r.status).length;
    return { present, absent, late, unmarked, total: Object.keys(attendanceMap).length };
  }, [attendanceMap]);

  // Load Teacher Classes on mount
  useEffect(() => {
    getClasses({ limit: 100 })
      .then(res => {
        const cls = res.data.data || [];
        setClasses(cls);
        if (cls.length > 0) setClassId(cls[0]._id);
      })
      .catch(err => toast.error('Failed to load classes: ' + getErrorMessage(err)));
  }, []);

  // Fetch Attendance or Students
  const loadAttendance = useCallback(async () => {
    if (!classId || !date) return;
    setLoading(true);
    try {
      // 1. Try to fetch existing attendance sheet
      const res = await getAttendance({ classId, date, term, session });
      const record = res.data.data;

      if (record) {
        setIsExistingRecord(true);
        // Map existing records
        const map = {};
        const stList = [];
        record.records.forEach(r => {
          map[r.studentId._id] = { status: r.status, notes: r.notes || '' };
          stList.push(r.studentId); // student object populated from backend
        });
        setStudents(stList.sort((a, b) => (a.userId?.name || '').localeCompare(b.userId?.name || '')));
        setAttendanceMap(map);
        setIsDraft(false);
        localStorage.removeItem(`attendance_draft_${classId}_${date}`);
      } else {
        setIsExistingRecord(false);
        // 2. No record exists, fetch students
        const stRes = await getStudents({ classId, limit: 200 });
        const stList = Array.isArray(stRes?.data?.data) ? stRes.data.data : [];
        stList.sort((a, b) => (a.userId?.name || '').localeCompare(b.userId?.name || ''));
        setStudents(stList);

        // Check local storage draft
        const draftStr = localStorage.getItem(`attendance_draft_${classId}_${date}`);
        if (draftStr) {
          setAttendanceMap(JSON.parse(draftStr));
          setIsDraft(true);
        } else {
          // Default all to present
          const map = {};
          stList.forEach(s => {
            map[s._id] = { status: 'present', notes: '' };
          });
          setAttendanceMap(map);
          setIsDraft(false);
        }
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [classId, date, term, session]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Auto-save to localStorage
  useEffect(() => {
    if (!isExistingRecord && Object.keys(attendanceMap).length > 0) {
      const timer = setTimeout(() => {
        localStorage.setItem(`attendance_draft_${classId}_${date}`, JSON.stringify(attendanceMap));
        setIsDraft(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [attendanceMap, classId, date, isExistingRecord]);

  const updateStatus = (id, status) => {
    setAttendanceMap(prev => ({
      ...prev,
      [id]: { ...prev[id], status }
    }));
  };

  const updateNotes = (id, notes) => {
    setAttendanceMap(prev => ({
      ...prev,
      [id]: { ...prev[id], notes }
    }));
  };

  const markAll = (status) => {
    setAttendanceMap(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = { ...next[id], status };
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (stats.unmarked > 0) {
      toast.error(`Cannot save. ${stats.unmarked} student(s) are unmarked.`);
      return;
    }
    
    setSaving(true);
    try {
      const records = Object.keys(attendanceMap).map(studentId => ({
        studentId,
        status: attendanceMap[studentId].status,
        notes: attendanceMap[studentId].notes
      }));

      await saveAttendance({ classId, date, term, session, records });
      toast.success('Attendance saved successfully!');
      setIsExistingRecord(true);
      setIsDraft(false);
      localStorage.removeItem(`attendance_draft_${classId}_${date}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      <ErrorBoundary>
        {/* Header */}
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FiCheckSquare className="text-primary-500" size={22} /> Daily Attendance
          </h1>
          <p className="page-subtitle">Mark and manage attendance records for your classes</p>
        </div>

        {/* Controls */}
        <div className="card p-4 flex flex-wrap gap-4 items-end bg-secondary-50/50">
          <div className="flex-1 min-w-[200px]">
            <label className="input-label">Select Class</label>
            <select className="input-field" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Select a class...</option>
              {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="input-label">Date</label>
            <input 
              type="date" 
              className="input-field" 
              value={date} 
              max={today}
              onChange={e => setDate(e.target.value)} 
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="input-label">Term</label>
            <select className="input-field" value={term} onChange={e => setTerm(e.target.value)}>
              {TERMS.map(t => <option key={t} value={t} className="capitalize">{t} Term</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="input-label">Session</label>
            <select className="input-field" value={session} onChange={e => setSession(e.target.value)}>
              {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {!classId && (
          <div className="text-center py-12 text-secondary-500">
            Please select a class to mark attendance.
          </div>
        )}

        {classId && loading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-secondary-500">Loading students...</p>
          </div>
        )}

        {classId && !loading && students.length === 0 && (
          <div className="text-center py-12 text-secondary-500">
            No students found in this class.
          </div>
        )}

        {classId && !loading && students.length > 0 && (
          <div className="space-y-4 animate-fade-in">
            {/* Warning Banner / Draft Banner */}
            {!isExistingRecord && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                <FiAlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800">
                    Please review attendance before saving
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {isDraft 
                      ? 'Loaded from local draft. Unsaved changes present.' 
                      : 'Students have been defaulted to Present for your convenience.'}
                  </p>
                </div>
              </div>
            )}

            {/* Summary Bar & Bulk Actions */}
            <div className="card p-4 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
                  <FiCheckCircle /> Present: {stats.present}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-red-700 bg-red-50 px-3 py-1.5 rounded-lg">
                  <FiXCircle /> Absent: {stats.absent}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg">
                  <FiClock /> Late: {stats.late}
                </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <button onClick={() => markAll('present')} className="btn-secondary text-xs flex-1 md:flex-none">Mark All Present</button>
                <button onClick={() => markAll('absent')} className="btn-secondary text-xs flex-1 md:flex-none">Mark All Absent</button>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary-50 text-xs text-secondary-500 uppercase font-semibold border-b border-secondary-100">
                      <th className="p-4 w-12">#</th>
                      <th className="p-4">Student</th>
                      <th className="p-4 min-w-[280px]">Status</th>
                      <th className="p-4 min-w-[200px]">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {students.map((st, idx) => {
                      const amap = attendanceMap[st._id] || {};
                      const status = amap.status;
                      
                      return (
                        <tr key={st._id} className="hover:bg-secondary-50/50 transition-colors">
                          <td className="p-4 text-sm text-secondary-500">{idx + 1}</td>
                          <td className="p-4">
                            <p className="text-sm font-semibold text-secondary-800">{st.userId?.name || 'Unknown'}</p>
                            <p className="text-xs text-secondary-400">{st.admissionNumber}</p>
                          </td>
                          <td className="p-4">
                            <div className="flex bg-secondary-100/50 p-1 rounded-xl w-fit">
                              <button 
                                onClick={() => updateStatus(st._id, 'present')}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${status === 'present' ? 'bg-green-500 text-white shadow-sm' : 'text-secondary-600 hover:bg-secondary-200/50'}`}
                              >
                                Present
                              </button>
                              <button 
                                onClick={() => updateStatus(st._id, 'absent')}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${status === 'absent' ? 'bg-red-500 text-white shadow-sm' : 'text-secondary-600 hover:bg-secondary-200/50'}`}
                              >
                                Absent
                              </button>
                              <button 
                                onClick={() => updateStatus(st._id, 'late')}
                                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${status === 'late' ? 'bg-amber-500 text-white shadow-sm' : 'text-secondary-600 hover:bg-secondary-200/50'}`}
                              >
                                Late
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <input 
                              type="text"
                              value={amap.notes || ''}
                              onChange={e => updateNotes(st._id, e.target.value)}
                              placeholder="Reason (optional)"
                              className="input-field py-1.5 text-sm"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="btn-primary py-3 px-8 text-base flex items-center gap-2 w-full sm:w-auto justify-center shadow-lg hover:shadow-xl transition-all"
              >
                {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={18} />}
                {isExistingRecord ? 'Update Attendance' : 'Save Attendance'}
              </button>
            </div>
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
}
