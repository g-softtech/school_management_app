/**
 * pdfHelper.js
 * Generates a printable/downloadable PDF-like result sheet
 * using a hidden print window — no external library needed.
 *
 * Usage:
 *   import { downloadResultsPDF } from '../utils/pdfHelper';
 *   downloadResultsPDF({ student, results, summary, term, session });
 */

const GRADE_COLOR = (grade) => {
  if (['A1','B2','B3'].includes(grade)) return '#15803d';
  if (['C4','C5','C6'].includes(grade)) return '#1d4ed8';
  if (['D7','E8'].includes(grade))      return '#b45309';
  return '#dc2626';
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function downloadResultsPDF({ student, results = [], summary = null, term, session }) {
  const studentName = student?.userId?.name || student?.name || 'Unknown';
  const admNo       = student?.admissionNumber || '—';
  const className   = `${student?.classId?.name || ''} ${student?.classId?.section || ''}`.trim();
  const termLabel   = term ? term.charAt(0).toUpperCase() + term.slice(1) + ' Term' : '';

  const rows = results.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px">${i + 1}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;font-weight:500">${r.subjectId?.name || '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;text-align:center">${r.ca ?? '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;text-align:center">${r.exam ?? '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;font-weight:700;text-align:center">${r.total ?? '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;text-align:center;color:${GRADE_COLOR(r.grade)};font-weight:700">${r.grade || '—'}</td>
      <td style="padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;color:${GRADE_COLOR(r.grade)}">${r.remark || '—'}</td>
    </tr>
  `).join('');

  const summarySection = summary ? `
    <div style="display:flex;gap:16px;margin:12px 0;flex-wrap:wrap">
      <div style="background:#f3f4f6;padding:8px 16px;border-radius:8px;text-align:center">
        <div style="font-size:11px;color:#6b7280">Subjects</div>
        <div style="font-size:20px;font-weight:700;color:#111">${summary.totalSubjects}</div>
      </div>
      <div style="background:#f3f4f6;padding:8px 16px;border-radius:8px;text-align:center">
        <div style="font-size:11px;color:#6b7280">Average</div>
        <div style="font-size:20px;font-weight:700;color:#1d4ed8">${summary.average}%</div>
      </div>
      <div style="background:#dcfce7;padding:8px 16px;border-radius:8px;text-align:center">
        <div style="font-size:11px;color:#15803d">Passed</div>
        <div style="font-size:20px;font-weight:700;color:#15803d">${summary.passed}</div>
      </div>
      <div style="background:#fee2e2;padding:8px 16px;border-radius:8px;text-align:center">
        <div style="font-size:11px;color:#dc2626">Failed</div>
        <div style="font-size:20px;font-weight:700;color:#dc2626">${summary.failed}</div>
      </div>
    </div>
  ` : '';

  const attendanceSection = summary?.attendance ? `
    <div style="display:flex;gap:16px;margin:12px 0 24px 0;flex-wrap:wrap;border-top:1px solid #e5e7eb;padding-top:12px">
      <div style="flex:100%;font-size:12px;font-weight:600;color:#111;text-transform:uppercase;margin-bottom:-4px">Attendance Summary</div>
      <div style="background:#f3f4f6;padding:8px 16px;border-radius:8px;text-align:center;flex:1">
        <div style="font-size:11px;color:#6b7280">Valid Days</div>
        <div style="font-size:20px;font-weight:700;color:#111">${summary.attendance.validDays}</div>
      </div>
      <div style="background:#dcfce7;padding:8px 16px;border-radius:8px;text-align:center;flex:1">
        <div style="font-size:11px;color:#15803d">Days Present</div>
        <div style="font-size:20px;font-weight:700;color:#15803d">${summary.attendance.presentDays + summary.attendance.lateDays}</div>
      </div>
      <div style="background:#fee2e2;padding:8px 16px;border-radius:8px;text-align:center;flex:1">
        <div style="font-size:11px;color:#dc2626">Days Absent</div>
        <div style="font-size:20px;font-weight:700;color:#dc2626">${summary.attendance.absentDays}</div>
      </div>
      <div style="background:#eff6ff;padding:8px 16px;border-radius:8px;text-align:center;flex:1">
        <div style="font-size:11px;color:#1d4ed8">Attendance</div>
        <div style="font-size:20px;font-weight:700;color:#1d4ed8">${summary.attendance.attendancePercentage}%</div>
      </div>
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Result Sheet — ${studentName}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          table { page-break-inside: avoid; }
        }
        body {
          font-family: Arial, sans-serif;
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
          color: #111;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #C9A227;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .school-name { font-size: 22px; font-weight: 800; color: #1F2937; }
        .school-sub  { font-size: 12px; color: #6b7280; margin-top: 2px; }
        .badge {
          background: #C9A227;
          color: white;
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }
        .student-info {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          gap: 32px;
          flex-wrap: wrap;
        }
        .info-item { }
        .info-label { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-value { font-size: 14px; font-weight: 600; color: #1F2937; margin-top: 2px; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        thead tr {
          background: #1F2937;
          color: white;
        }
        th {
          padding: 10px 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .print-btn {
          display: inline-block;
          margin-bottom: 16px;
          padding: 8px 20px;
          background: #C9A227;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .footer {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #9ca3af;
        }
      </style>
    </head>
    <body>
      <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save PDF</button>

      <div class="header">
        <div>
          <div class="school-name">SmartSchool</div>
          <div class="school-sub">Academic Result Sheet</div>
        </div>
        <div class="badge">${termLabel} · ${session || ''}</div>
      </div>

      <div class="student-info">
        <div class="info-item">
          <div class="info-label">Student Name</div>
          <div class="info-value">${studentName}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Admission No.</div>
          <div class="info-value">${admNo}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Class</div>
          <div class="info-value">${className || '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Term</div>
          <div class="info-value">${termLabel}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Session</div>
          <div class="info-value">${session || '—'}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Date Printed</div>
          <div class="info-value">${fmtDate(new Date())}</div>
        </div>
      </div>

      ${summarySection}
      ${attendanceSection}

      ${results.length === 0 ? '<p style="text-align:center;color:#9ca3af;padding:24px">No results found for this term.</p>' : `
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Subject</th>
              <th style="text-align:center">CA (40)</th>
              <th style="text-align:center">Exam (60)</th>
              <th style="text-align:center">Total</th>
              <th style="text-align:center">Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `}

      <div class="footer">
        <span>Generated by SmartSchool Management System</span>
        <span>${fmtDate(new Date())}</span>
      </div>
    </body>
    </html>
  `;

  const win = window.open('', '_blank', 'width=960,height=700');
  if (!win) {
    alert('Please allow popups for this site to download the PDF.');
    return;
  }
  win.document.write(html);
  win.document.close();

  // Auto-trigger print after content loads
  win.onload = () => win.focus();
}
