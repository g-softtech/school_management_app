import React from 'react';

const GRADE_COLOR = {
  A1: 'text-green-600',
  B2: 'text-green-600',
  B3: 'text-green-600',
  C4: 'text-blue-600',
  C5: 'text-blue-600',
  C6: 'text-blue-600',
  D7: 'text-amber-600',
  E8: 'text-amber-600',
  F9: 'text-red-600',
};

const PASS_GRADES = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6'];

export default function ReportCard({ student, results = [], summary = null, term, session, loading = false }) {
  const termLabel = term ? term.charAt(0).toUpperCase() + term.slice(1) + ' Term' : '';
  const className = student?.classId
    ? `${student.classId.name || ''} ${student.classId.section || ''}`.trim()
    : '—';
  const studentName = student?.userId?.name || student?.name || '—';
  const admNo = student?.admissionNumber || '—';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8 space-y-6">
        <div className="h-16 bg-secondary-100 rounded animate-pulse" />
        <div className="h-32 bg-secondary-50 rounded animate-pulse" />
        <div className="h-48 bg-secondary-50 rounded animate-pulse" />
      </div>
    );
  }

  // Teacher comment fallback/generation
  // Ideally this comes from the backend. We'll use a placeholder if not available.
  const getFallbackComment = () => {
    if (!summary) return 'No comment available.';
    const firstName = studentName.split(' ')[0] || 'The student';
    const avg = summary.average || 0;
    if (avg >= 75) return `${firstName} has performed commendably this term. With continued dedication and focus, even greater results are achievable next term.`;
    if (avg >= 50) return `${firstName} has shown satisfactory performance. More consistent effort is encouraged.`;
    return `${firstName} needs to put in more effort to improve academic performance.`;
  };

  const teacherComment = summary?.teacherComment || getFallbackComment();
  const principalComment = summary?.principalComment || '';

  // Promotion status logic
  const isThirdTerm = term?.toLowerCase() === 'third';
  const getPromotionStatus = () => {
    if (!summary) return null;
    if (summary.promotionStatus) return summary.promotionStatus; // if backend starts sending it
    
    const avg = summary.average || 0;
    const passRate = summary.totalSubjects > 0 ? (summary.passed / summary.totalSubjects) * 100 : 0;
    
    if (avg >= 50 && passRate >= 60) {
      return { status: 'PROMOTED', label: '✅ PROMOTED TO NEXT CLASS', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', msg: 'Congratulations! Promoted to the next class.' };
    } else if (avg >= 45 && passRate >= 40) {
      return { status: 'CONDITIONAL', label: '⚠️ NEEDS IMPROVEMENT', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', msg: 'Shows potential but requires significant improvement.' };
    } else {
      return { status: 'RETAINED', label: '❌ TO REPEAT CLASS', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', msg: 'Requires repeating the current class.' };
    }
  };

  const promotion = isThirdTerm ? getPromotionStatus() : null;

  // Performance bar width
  const avgWidth = Math.min(100, Math.max(0, summary?.average || 0));
  const passWidth = summary?.totalSubjects > 0 ? ((summary?.passed || 0) / summary.totalSubjects) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 p-6 sm:p-10 text-secondary-800 max-w-5xl mx-auto mb-8">
      
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-4 border-[#C9A227] pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-secondary-900 tracking-tight mb-1">SmartSchool</h1>
          <p className="text-sm text-secondary-500 font-medium uppercase tracking-widest">Academic Report Card</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <span className="inline-block bg-[#C9A227] text-white px-5 py-2 rounded-full text-sm font-bold shadow-sm">
            {termLabel} · {session}
          </span>
        </div>
      </div>

      {/* ── Info Box ─────────────────────────────────────────────────────────── */}
      <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-6 mb-8">
        
        {/* Row 1: Student details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div>
            <p className="text-xs text-secondary-500 font-semibold uppercase tracking-wider mb-1">Student Name</p>
            <p className="text-lg font-bold text-secondary-900">{studentName}</p>
          </div>
          <div>
            <p className="text-xs text-secondary-500 font-semibold uppercase tracking-wider mb-1">Admission No.</p>
            <p className="text-base font-bold text-secondary-900">{admNo}</p>
          </div>
          <div>
            <p className="text-xs text-secondary-500 font-semibold uppercase tracking-wider mb-1">Class</p>
            <p className="text-base font-bold text-secondary-900">{className}</p>
          </div>
        </div>

        {/* Row 2: Performance Stats */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-secondary-500 font-semibold uppercase tracking-wider mb-1">Average</p>
              <p className="text-2xl font-bold text-blue-600 mb-2">{summary.average}%</p>
              <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${avgWidth}%` }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-secondary-500 font-semibold uppercase tracking-wider mb-1">Subjects</p>
              <p className="text-2xl font-bold text-secondary-900">{summary.totalSubjects}</p>
            </div>
            <div>
              <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-1">Passed</p>
              <p className="text-2xl font-bold text-green-600 mb-2">{summary.passed}</p>
              <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-600 rounded-full" style={{ width: `${passWidth}%` }} />
              </div>
            </div>
            <div>
              <p className="text-xs text-red-500 font-semibold uppercase tracking-wider mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-500">{summary.failed}</p>
            </div>
          </div>
        )}

        {/* Row 3: Attendance Space */}
        {summary?.attendance && (
          <div className="mt-8 pt-6 border-t border-secondary-200">
            <p className="text-xs text-secondary-500 font-semibold uppercase tracking-wider mb-4">Attendance Record</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-secondary-500 font-medium mb-1">Valid Days</p>
                <p className="text-xl font-bold text-secondary-800">{summary.attendance.validDays}</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500 font-medium mb-1">Days Present</p>
                <p className="text-xl font-bold text-green-600">{summary.attendance.presentDays + summary.attendance.lateDays}</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500 font-medium mb-1">Days Absent</p>
                <p className="text-xl font-bold text-red-500">{summary.attendance.absentDays}</p>
              </div>
              <div>
                <p className="text-xs text-secondary-500 font-medium mb-1">Percentage</p>
                <p className="text-xl font-bold text-blue-600">{summary.attendance.attendancePercentage}%</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Results Table ────────────────────────────────────────────────────── */}
      <div className="border border-secondary-200 rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm min-w-full">
          <thead>
            <tr className="bg-[#1F2937] text-white">
              <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-xs">Subject</th>
              <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-xs">CA (40)</th>
              <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-xs">Exam (60)</th>
              <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-xs">Total</th>
              <th className="px-3 py-3 text-center font-bold uppercase tracking-wider text-xs">Grade</th>
              <th className="px-5 py-3 text-left font-bold uppercase tracking-wider text-xs">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200">
            {results.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-5 py-8 text-center text-secondary-500 italic">No results recorded</td>
              </tr>
            ) : (
              results.map((r, i) => {
                const gradeColor = GRADE_COLOR[r.grade] || 'text-secondary-600';
                return (
                  <tr key={r._id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-secondary-50'}>
                    <td className="px-5 py-3 font-semibold text-secondary-800">{r.subjectId?.name || r.subjectName || '—'}</td>
                    <td className="px-3 py-3 text-center text-secondary-700">{r.ca ?? '—'}</td>
                    <td className="px-3 py-3 text-center text-secondary-700">{r.exam ?? '—'}</td>
                    <td className="px-3 py-3 text-center font-bold text-secondary-900">{r.total ?? '—'}</td>
                    <td className={`px-3 py-3 text-center font-bold ${gradeColor}`}>{r.grade || '—'}</td>
                    <td className={`px-5 py-3 ${PASS_GRADES.includes(r.grade) ? 'text-green-600' : 'text-red-600'}`}>
                      {r.remark || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Comments ─────────────────────────────────────────────────────────── */}
      <div className="space-y-6 mb-12">
        <div className="bg-[#fcfbf7] border-l-4 border-[#C9A227] p-4 rounded-r-lg">
          <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest mb-2">Teacher's Comment</p>
          <p className="text-sm text-secondary-700 italic font-medium">"{teacherComment}"</p>
        </div>
        {principalComment && (
          <div className="bg-[#fcfbf7] border-l-4 border-[#C9A227] p-4 rounded-r-lg">
            <p className="text-[10px] font-bold text-secondary-500 uppercase tracking-widest mb-2">Principal's Comment</p>
            <p className="text-sm text-secondary-700 italic font-medium">"{principalComment}"</p>
          </div>
        )}
      </div>

      {/* ── Promotion Banner ─────────────────────────────────────────────────── */}
      {isThirdTerm && (
        <div className={`mb-8 p-4 border-2 rounded-xl ${promotion?.bg || 'bg-secondary-50'} ${promotion?.border || 'border-secondary-200'}`}>
          <p className={`font-extrabold text-base mb-1 ${promotion?.text || 'text-secondary-600'}`}>
            {promotion?.label || 'Promotion Status Pending'}
          </p>
          <p className={`text-xs ${promotion?.text || 'text-secondary-500'}`}>
            {promotion?.msg || 'Assessment for promotion is not yet complete.'}
          </p>
        </div>
      )}

      {/* ── Signatures ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8 mt-16">
        <div className="text-center">
          <div className="border-b border-secondary-400 w-full mb-2"></div>
          <p className="text-xs text-secondary-500 font-medium">Class Teacher</p>
        </div>
        <div className="text-center">
          <div className="border-b border-secondary-400 w-full mb-2"></div>
          <p className="text-xs text-secondary-500 font-medium">Head Teacher / Principal</p>
        </div>
        <div className="text-center">
          <div className="border-b border-secondary-400 w-full mb-2"></div>
          <p className="text-xs text-secondary-500 font-medium">Parent/Guardian</p>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div className="border-t border-secondary-200 pt-4 flex justify-between items-center text-xs text-secondary-400">
        <p>Generated: {dateStr}</p>
        <p>SmartSchool Management System</p>
      </div>

    </div>
  );
}
