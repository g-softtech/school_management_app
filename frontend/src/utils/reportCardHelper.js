/**
 * reportCardHelper.js
 * Generates a multi-student class report card PDF
 * using a print window — no external dependencies.
 *
 * Usage:
 *   import { generateClassReportCard } from '../utils/reportCardHelper';
 *   generateClassReportCard({ className, students, term, session });
 *
 * Each student object: { name, admissionNumber, results: [{subjectName, ca, exam, total, grade, remark}] }
 */

const GRADE_COLOR = (grade) => {
  if (['A1','B2','B3'].includes(grade)) return '#15803d';
  if (['C4','C5','C6'].includes(grade)) return '#1d4ed8';
  if (['D7','E8'].includes(grade))      return '#b45309';
  return '#dc2626';
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function computeSummary(results) {
  if (!results?.length) return { avg: 0, passed: 0, failed: 0 };
  const PASS = ['A1','B2','B3','C4','C5','C6'];
  const passed = results.filter((r) => PASS.includes(r.grade)).length;
  const avg    = (results.reduce((s, r) => s + (r.total || 0), 0) / results.length).toFixed(1);
  return { avg, passed, failed: results.length - passed };
}

function buildStudentCard(student, index) {
  const summary = computeSummary(student.results);
  const rows = (student.results || []).map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:12px">${r.subjectName || '—'}</td>
      <td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:12px;text-align:center">${r.ca ?? '—'}</td>
      <td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:12px;text-align:center">${r.exam ?? '—'}</td>
      <td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:12px;font-weight:700;text-align:center">${r.total ?? '—'}</td>
      <td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:12px;text-align:center;color:${GRADE_COLOR(r.grade)};font-weight:700">${r.grade || '—'}</td>
      <td style="padding:6px 10px;border:1px solid #e5e7eb;font-size:12px;color:${GRADE_COLOR(r.grade)}">${r.remark || '—'}</td>
    </tr>
  `).join('');

  return `
    <div class="card" style="${index > 0 ? 'page-break-before:always;' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #C9A227;padding-bottom:10px;margin-bottom:12px">
        <div>
          <div style="font-size:18px;font-weight:800;color:#1F2937">SmartSchool</div>
          <div style="font-size:11px;color:#6b7280">Academic Report Card</div>
        </div>
        <div style="text-align:right">
          <div style="background:#C9A227;color:white;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block">
            ${student.term ? student.term.charAt(0).toUpperCase() + student.term.slice(1) + ' Term' : ''} · ${student.session || ''}
          </div>
        </div>
      </div>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;gap:28px;flex-wrap:wrap">
        <div>
          <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Student</div>
          <div style="font-size:14px;font-weight:700;color:#1F2937">${student.name}</div>
        </div>
        <div>
          <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Admission No.</div>
          <div style="font-size:13px;font-weight:600;color:#1F2937">${student.admissionNumber || '—'}</div>
        </div>
        <div>
          <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Class</div>
          <div style="font-size:13px;font-weight:600;color:#1F2937">${student.className || '—'}</div>
        </div>
        <div>
          <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Average</div>
          <div style="font-size:16px;font-weight:700;color:#1d4ed8">${summary.avg}%</div>
        </div>
        <div>
          <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Passed</div>
          <div style="font-size:16px;font-weight:700;color:#15803d">${summary.passed}</div>
        </div>
        <div>
          <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Failed</div>
          <div style="font-size:16px;font-weight:700;color:#dc2626">${summary.failed}</div>
        </div>
      </div>

      ${rows ? `
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#1F2937;color:white">
              <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase">Subject</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:600">CA (40)</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:600">Exam (60)</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:600">Total</th>
              <th style="padding:8px 10px;text-align:center;font-size:11px;font-weight:600">Grade</th>
              <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600">Remark</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      ` : '<p style="text-align:center;color:#9ca3af;padding:20px">No results for this term.</p>'}

      <div style="margin-top:16px;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px">
        <span>Generated: ${fmtDate(new Date())}</span>
        <span>SmartSchool Management System</span>
      </div>
    </div>
  `;
}

export function generateClassReportCard({ className, students = [], term, session }) {
  if (!students.length) { alert('No students to generate report cards for.'); return; }

  const cards = students.map((s, i) => buildStudentCard({ ...s, term, session, className }, i)).join('');

  const html = `<!DOCTYPE html><html><head>
    <title>Report Cards — ${className} · ${term} Term · ${session}</title>
    <style>
      @media print {
        body { margin: 0; }
        .no-print { display: none !important; }
        .card { page-break-inside: avoid; }
      }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 24px; background: #f9fafb; color: #111; }
      .card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
      .controls { text-align:center; margin-bottom: 20px; }
      .btn { display:inline-block; padding:10px 24px; background:#C9A227; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600; margin: 0 6px; }
    </style>
  </head><body>
    <div class="controls no-print">
      <button class="btn" onclick="window.print()">🖨️ Print All Report Cards</button>
      <span style="font-size:13px;color:#6b7280;margin-left:8px">${students.length} student${students.length !== 1 ? 's' : ''} · ${className} · ${term ? term.charAt(0).toUpperCase() + term.slice(1) + ' Term' : ''} · ${session}</span>
    </div>
    ${cards}
  </body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Please allow popups to generate report cards.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
}

// Single student report card (simpler alias)
export function generateSingleReportCard({ student, results, term, session }) {
  generateClassReportCard({
    className: `${student?.classId?.name || ''} ${student?.classId?.section || ''}`.trim(),
    students: [{
      name:            student?.userId?.name || student?.name,
      admissionNumber: student?.admissionNumber,
      results:         results.map((r) => ({
        subjectName: r.subjectId?.name,
        ca: r.ca, exam: r.exam, total: r.total, grade: r.grade, remark: r.remark,
      })),
    }],
    term,
    session,
  });
}
