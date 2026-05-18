/**
 * reportCardHelper.js — v2
 * 
 * Upgrades:
 * 1. AI-generated personalised comment per student (via Anthropic API)
 * 2. Third-term promotion decision (Promoted / Needs Improvement / Retained)
 * 3. Visual promotion banner on third-term cards
 * 4. Better overall layout
 *
 * Usage:
 *   generateClassReportCard({ className, students, term, session });
 *
 * Each student: { name, admissionNumber, results: [{subjectName, ca, exam, total, grade, remark}] }
 */

const PASS_GRADES = ['A1','B2','B3','C4','C5','C6'];

const GRADE_COLOR = (grade) => {
  if (['A1','B2','B3'].includes(grade)) return '#15803d';
  if (['C4','C5','C6'].includes(grade)) return '#1d4ed8';
  if (['D7','E8'].includes(grade))      return '#b45309';
  return '#dc2626';
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';

// ── AI Comment Generator ──────────────────────────────────────────────────────
async function generateAIComment(studentName, avg, passed, failed, results, term) {
  try {
    const subjectSummary = results.map(r =>
      `${r.subjectName}: ${r.total}/100 (${r.grade})`
    ).join(', ');

    const prompt = `You are a school teacher writing a brief, warm and personalised academic comment for a student's report card.

Student: ${studentName}
Term: ${term} term
Average Score: ${avg}%
Subjects Passed: ${passed}
Subjects Failed: ${failed}
Subject breakdown: ${subjectSummary}

Write a 2-3 sentence personalised comment for this student's report card. 
- Be encouraging and constructive
- Mention specific strengths or areas for improvement based on the scores
- Use warm, professional language appropriate for a Nigerian school report card
- Do NOT use the word "overall" or start with "Overall"
- Do NOT use placeholder text like [subject] — use actual subject names from the breakdown
- Keep it under 60 words`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const comment = data.content?.[0]?.text?.trim();
    return comment || generateFallbackComment(studentName, avg, passed, failed);
  } catch {
    return generateFallbackComment(studentName, avg, passed, failed);
  }
}

// ── Fallback comment (used if AI fails) ──────────────────────────────────────
function generateFallbackComment(name, avg, passed, failed) {
  const firstName = name.split(' ')[0];
  const avgNum    = Number(avg);

  if (avgNum >= 75) {
    return `${firstName} has demonstrated exceptional academic performance this term with an outstanding average. Keep up the excellent work and continue to set high standards for yourself.`;
  } else if (avgNum >= 60) {
    return `${firstName} has performed commendably this term. With continued dedication and focus, even greater results are achievable next term.`;
  } else if (avgNum >= 50) {
    return `${firstName} has shown satisfactory performance this term. With more consistent effort and revision, ${firstName} can significantly improve next term.`;
  } else {
    return `${firstName} needs to put in more effort and dedication to improve academic performance. We encourage more study time, active class participation, and seeking help where needed.`;
  }
}

// ── Promotion Decision (third term only) ─────────────────────────────────────
function getPromotionStatus(avg, passed, total) {
  const avgNum      = Number(avg);
  const passRate    = total > 0 ? (passed / total) * 100 : 0;
  const isPromoted  = avgNum >= 50 && passRate >= 60; // pass avg + pass at least 60% of subjects

  if (isPromoted) {
    return {
      status:  'PROMOTED',
      label:   '✅ PROMOTED TO NEXT CLASS',
      color:   '#15803d',
      bg:      '#f0fdf4',
      border:  '#bbf7d0',
      message: 'Congratulations! Based on excellent performance this session, this student is promoted to the next class.',
    };
  } else if (avgNum >= 45 && passRate >= 40) {
    return {
      status:  'CONDITIONAL',
      label:   '⚠️ NEEDS IMPROVEMENT',
      color:   '#b45309',
      bg:      '#fffbeb',
      border:  '#fde68a',
      message: 'This student shows potential but requires significant improvement before progressing. A special assessment may be required.',
    };
  } else {
    return {
      status:  'RETAINED',
      label:   '❌ TO REPEAT CLASS',
      color:   '#dc2626',
      bg:      '#fef2f2',
      border:  '#fecaca',
      message: 'Due to insufficient academic performance this session, this student is required to repeat the current class.',
    };
  }
}

// ── Build single student card HTML ────────────────────────────────────────────
function buildStudentCard(student, index, className, term, session, aiComment) {
  const studentName = student.name || student.userId?.name || 'Unknown';
  const admNo       = student.admissionNumber || student.admNo || '—';
  const cls         = student.className || className || '—';
  const termLabel   = term ? term.charAt(0).toUpperCase() + term.slice(1) + ' Term' : '';
  const results     = student.results || [];
  const isThirdTerm = term?.toLowerCase() === 'third';

  const passed = results.filter(r => PASS_GRADES.includes(r.grade)).length;
  const failed  = results.length - passed;
  const avg     = results.length > 0
    ? (results.reduce((s, r) => s + (Number(r.total) || 0), 0) / results.length).toFixed(1)
    : '0.0';

  const promotion = isThirdTerm ? getPromotionStatus(avg, passed, results.length) : null;

  const rows = results.map((r, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-size:12px">${r.subjectName || r.subject || '—'}</td>
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-size:12px;text-align:center">${r.ca ?? '—'}</td>
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-size:12px;text-align:center">${r.exam ?? '—'}</td>
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-size:12px;font-weight:700;text-align:center">${r.total ?? '—'}</td>
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-size:12px;text-align:center;color:${GRADE_COLOR(r.grade)};font-weight:700">${r.grade || '—'}</td>
      <td style="padding:7px 12px;border:1px solid #e5e7eb;font-size:12px;color:${GRADE_COLOR(r.grade)}">${r.remark || '—'}</td>
    </tr>
  `).join('');

  // Performance bar
  const performanceBar = (value, max, color) => {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return `<div style="background:#e5e7eb;border-radius:4px;height:6px;overflow:hidden;margin-top:4px">
      <div style="background:${color};height:100%;width:${pct}%;border-radius:4px"></div>
    </div>`;
  };

  // Promotion banner (third term only)
  const promotionHTML = promotion ? `
    <div style="margin-top:16px;padding:12px 16px;background:${promotion.bg};border:2px solid ${promotion.border};border-radius:10px">
      <div style="font-size:14px;font-weight:800;color:${promotion.color};margin-bottom:4px">${promotion.label}</div>
      <div style="font-size:11px;color:${promotion.color};opacity:0.85">${promotion.message}</div>
    </div>
  ` : '';

  // AI comment section
  const commentHTML = aiComment ? `
    <div style="margin-top:14px;padding:12px 16px;background:#f8faff;border-left:4px solid #C9A227;border-radius:6px">
      <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;font-weight:600">Teacher's Comment</div>
      <div style="font-size:12px;color:#374151;line-height:1.6;font-style:italic">"${aiComment}"</div>
    </div>
  ` : '';

  // Signature section
  const signaturesHTML = `
    <div style="margin-top:18px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px">
      ${['Class Teacher', 'Head Teacher', 'Parent/Guardian'].map(role => `
        <div style="text-align:center">
          <div style="border-bottom:1px solid #9ca3af;margin-bottom:4px;height:28px"></div>
          <div style="font-size:10px;color:#6b7280">${role}</div>
        </div>
      `).join('')}
    </div>
  `;

  return `
    <div class="card" style="${index > 0 ? 'page-break-before:always;' : ''}">
      <!-- Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #C9A227;padding-bottom:10px;margin-bottom:14px">
        <div>
          <div style="font-size:20px;font-weight:800;color:#1F2937">SmartSchool</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">Academic Report Card</div>
        </div>
        <div style="text-align:right">
          <div style="background:#C9A227;color:white;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;display:inline-block">
            ${termLabel} · ${session || ''}
          </div>
          ${isThirdTerm ? '<div style="font-size:10px;color:#C9A227;margin-top:4px;font-weight:600">END OF SESSION</div>' : ''}
        </div>
      </div>

      <!-- Student Info -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;margin-bottom:14px">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:12px">
          <div>
            <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Student Name</div>
            <div style="font-size:14px;font-weight:700;color:#1F2937;margin-top:2px">${studentName}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Admission No.</div>
            <div style="font-size:13px;font-weight:600;color:#1F2937;margin-top:2px">${admNo}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Class</div>
            <div style="font-size:13px;font-weight:600;color:#1F2937;margin-top:2px">${cls}</div>
          </div>
        </div>
        <!-- Performance stats -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding-top:10px;border-top:1px solid #e5e7eb">
          <div>
            <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Average</div>
            <div style="font-size:18px;font-weight:700;color:#1d4ed8;margin-top:2px">${avg}%</div>
            ${performanceBar(Number(avg), 100, '#1d4ed8')}
          </div>
          <div>
            <div style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Subjects</div>
            <div style="font-size:18px;font-weight:700;color:#1F2937;margin-top:2px">${results.length}</div>
          </div>
          <div>
            <div style="font-size:9px;color:#15803d;text-transform:uppercase;letter-spacing:0.5px">Passed</div>
            <div style="font-size:18px;font-weight:700;color:#15803d;margin-top:2px">${passed}</div>
            ${performanceBar(passed, results.length, '#15803d')}
          </div>
          <div>
            <div style="font-size:9px;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px">Failed</div>
            <div style="font-size:18px;font-weight:700;color:#dc2626;margin-top:2px">${failed}</div>
          </div>
        </div>
      </div>

      <!-- Results Table -->
      ${results.length === 0
        ? '<p style="text-align:center;color:#9ca3af;padding:20px;font-size:13px">No results recorded for this term.</p>'
        : `<table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#1F2937;color:white">
                <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase">Subject</th>
                <th style="padding:9px 12px;text-align:center;font-size:11px;font-weight:600">CA (40)</th>
                <th style="padding:9px 12px;text-align:center;font-size:11px;font-weight:600">Exam (60)</th>
                <th style="padding:9px 12px;text-align:center;font-size:11px;font-weight:600">Total</th>
                <th style="padding:9px 12px;text-align:center;font-size:11px;font-weight:600">Grade</th>
                <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600">Remark</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`
      }

      <!-- AI Comment -->
      ${commentHTML}

      <!-- Promotion Banner (third term only) -->
      ${promotionHTML}

      <!-- Signatures -->
      ${signaturesHTML}

      <!-- Footer -->
      <div style="margin-top:14px;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:8px">
        <span>Generated: ${fmtDate(new Date())}</span>
        <span>SmartSchool Management System</span>
      </div>
    </div>
  `;
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateClassReportCard({ className, students = [], term, session }) {
  if (!students.length) {
    alert('No student data to generate report cards for.');
    return;
  }

  const isThirdTerm = term?.toLowerCase() === 'third';

  // Open window immediately — show loading state
  const win = window.open('', '_blank', 'width=960,height=700');
  if (!win) {
    alert('Please allow popups for this site to generate report cards.');
    return;
  }

  win.document.write(`<!DOCTYPE html><html><head>
    <title>Generating Report Cards...</title>
    <style>
      body { font-family: Arial, sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; background:#f9fafb; }
      .loader { text-align:center; }
      .spinner { width:48px; height:48px; border:5px solid #e5e7eb; border-top-color:#C9A227; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 16px; }
      @keyframes spin { to { transform:rotate(360deg); } }
      h2 { color:#1F2937; font-size:18px; margin:0 0 8px; }
      p  { color:#6b7280; font-size:13px; margin:0; }
    </style>
  </head><body>
    <div class="loader">
      <div class="spinner"></div>
      <h2>Generating Report Cards</h2>
      <p>AI is writing personalised comments for ${students.length} student${students.length !== 1 ? 's' : ''}...</p>
    </div>
  </body></html>`);

  // Generate AI comments for all students in parallel
  const comments = await Promise.all(
    students.map(s => {
      const results = s.results || [];
      const avg     = results.length > 0
        ? (results.reduce((sum, r) => sum + (Number(r.total) || 0), 0) / results.length).toFixed(1)
        : '0';
      const passed = results.filter(r => PASS_GRADES.includes(r.grade)).length;
      const failed = results.length - passed;
      return generateAIComment(
        s.name || 'Student',
        avg, passed, failed, results, term
      );
    })
  );

  // Build all cards
  const cards = students.map((s, i) =>
    buildStudentCard(s, i, className, term, session, comments[i])
  ).join('');

  const termLabel = term ? term.charAt(0).toUpperCase() + term.slice(1) + ' Term' : '';

  const html = `<!DOCTYPE html><html><head>
    <title>Report Cards — ${className} · ${termLabel} · ${session}</title>
    <style>
      @media print {
        body { margin: 0; background: white; }
        .no-print { display: none !important; }
        .card { page-break-inside: avoid; box-shadow: none !important; }
      }
      * { box-sizing: border-box; }
      body { font-family: Arial, sans-serif; padding: 24px; background: #f9fafb; color: #111; }
      .card { background: white; border-radius: 12px; padding: 22px; margin-bottom: 28px; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }
      .controls { text-align:center; margin-bottom: 22px; background:white; padding:14px; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,0.06); }
      .btn { display:inline-block; padding:10px 28px; background:#C9A227; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600; margin:0 6px; }
      .btn:hover { background:#b08a1e; }
      .meta { font-size:13px; color:#6b7280; margin-left:10px; }
      .ai-badge { display:inline-block; background:#f0f9ff; color:#0369a1; font-size:11px; padding:2px 8px; border-radius:12px; margin-left:8px; border:1px solid #bae6fd; }
      ${isThirdTerm ? '.promotion-badge { display:inline-block; background:#fef9c3; color:#854d0e; font-size:11px; padding:2px 8px; border-radius:12px; margin-left:8px; border:1px solid #fde047; }' : ''}
    </style>
  </head><body>
    <div class="controls no-print">
      <button class="btn" onclick="window.print()">🖨️ Print All Report Cards</button>
      <span class="meta">
        ${students.length} student${students.length !== 1 ? 's' : ''} · ${className} · ${termLabel} · ${session || ''}
      </span>
      <span class="ai-badge">✨ AI Comments</span>
      ${isThirdTerm ? '<span class="promotion-badge">🎓 Promotion Results</span>' : ''}
    </div>
    ${cards}
  </body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}

// ── Single student report card ─────────────────────────────────────────────────
export async function generateSingleReportCard({ student, results, term, session }) {
  const className = student?.classId
    ? `${student.classId.name || ''} ${student.classId.section || ''}`.trim()
    : '';

  await generateClassReportCard({
    className,
    students: [{
      name:            student?.userId?.name || student?.name || 'Unknown',
      admissionNumber: student?.admissionNumber || '—',
      results: (results || []).map(r => ({
        subjectName: r.subjectId?.name || r.subjectName || '—',
        ca: r.ca, exam: r.exam, total: r.total, grade: r.grade, remark: r.remark,
      })),
    }],
    term,
    session,
  });
}
