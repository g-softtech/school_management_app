// Lives at: backend/src/modules/timetable/timetable.prisma.controller.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Timetable Reference Controller — Phase 4
//
// Demonstrates the full slot creation pattern with:
//   • req.tenantId isolation (injected by tenantContext middleware)
//   • Dual collision detection (class period + teacher double-booking)
//   • Atomic upsert via Prisma's schema-level @@unique constraints
// ─────────────────────────────────────────────────────────────────────────────

const prisma     = require('../../config/prisma');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

const VALID_DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const VALID_TERMS = ['first','second','third'];

// ─── Helper: parse "HH:mm" into comparable minutes-since-midnight ─────────────
function toMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// ─── POST /api/timetable ───────────────────────────────────────────────────────
// Create a single timetable slot, with full collision detection.
exports.createSlot = catchAsync(async (req, res, next) => {
  const { tenantId } = req;  // ← injected by tenantContext middleware

  const {
    classId, subjectId, teacherId,
    academicSession, term, day, period,
    startTime, endTime, label,
  } = req.body;

  // ── Required field validation ──────────────────────────────────────────────
  if (!classId || !academicSession || !term || !day || period === undefined || !startTime || !endTime) {
    return next(new ApiError(400, 'classId, academicSession, term, day, period, startTime and endTime are required'));
  }
  if (!VALID_DAYS.includes(day)) {
    return next(new ApiError(400, `day must be one of: ${VALID_DAYS.join(', ')}`));
  }
  if (!VALID_TERMS.includes(term)) {
    return next(new ApiError(400, `term must be one of: ${VALID_TERMS.join(', ')}`));
  }
  if (toMinutes(startTime) >= toMinutes(endTime)) {
    return next(new ApiError(400, 'startTime must be before endTime'));
  }

  // ── Cross-tenant FK validation — all references must belong to THIS tenant ──
  const classRecord = await prisma.class.findFirst({ where: { id: classId, tenantId } });
  if (!classRecord) return next(new ApiError(404, 'Class not found in this tenant'));

  if (subjectId) {
    const subject = await prisma.subject.findFirst({ where: { id: subjectId, tenantId } });
    if (!subject) return next(new ApiError(404, 'Subject not found in this tenant'));
  }

  if (teacherId) {
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, tenantId, role: 'teacher' },
    });
    if (!teacher) return next(new ApiError(404, 'Teacher not found in this tenant'));
  }

  // ── Collision Detection ────────────────────────────────────────────────────
  // The @@unique constraints on TimetableSlot enforce these at the DB level,
  // but we run explicit checks first so we can return informative error messages
  // rather than a raw Prisma P2002 unique constraint violation.

  // 1. Class period collision: is this slot already taken for this class?
  const classPeriodTaken = await prisma.timetableSlot.findUnique({
    where: {
      tenantId_classId_academicSession_term_day_period: {
        tenantId, classId, academicSession, term, day, period,
      },
    },
    select: { id: true, subject: { select: { name: true } }, startTime: true, endTime: true },
  });

  if (classPeriodTaken) {
    const subjectLabel = classPeriodTaken.subject?.name ?? 'a subject';
    return next(
      new ApiError(
        409,
        `Period ${period} on ${day} is already occupied by "${subjectLabel}" ` +
        `(${classPeriodTaken.startTime}–${classPeriodTaken.endTime}) for this class. ` +
        `Delete the existing slot first or choose a different period.`
      )
    );
  }

  // 2. Teacher double-booking: is this teacher already assigned to another class
  //    at the exact same period in the same session?
  if (teacherId) {
    const teacherBooking = await prisma.timetableSlot.findUnique({
      where: {
        tenantId_teacherId_academicSession_term_day_period: {
          tenantId, teacherId, academicSession, term, day, period,
        },
      },
      select: {
        id: true,
        class: { select: { name: true, section: true } },
        startTime: true,
        endTime: true,
      },
    });

    if (teacherBooking) {
      const clsLabel = teacherBooking.class
        ? `${teacherBooking.class.name}${teacherBooking.class.section ? ' ' + teacherBooking.class.section : ''}`
        : 'another class';
      return next(
        new ApiError(
          409,
          `This teacher is already scheduled for period ${period} on ${day} ` +
          `with "${clsLabel}" (${teacherBooking.startTime}–${teacherBooking.endTime}). ` +
          `Assign a different teacher or choose a different period.`
        )
      );
    }
  }

  // ── Create the slot ────────────────────────────────────────────────────────
  const slot = await prisma.timetableSlot.create({
    data: {
      tenantId,         // ← mandatory tenant stamp
      classId,
      subjectId:       subjectId  || null,
      teacherId:       teacherId  || null,
      academicSession,
      term,
      day,
      period:          Number(period),
      startTime,
      endTime,
      label:           label || null,
      createdById:     req.user?.id || null,
    },
    include: {
      class:   { select: { name: true, section: true } },
      subject: { select: { name: true, code: true } },
      teacher: { select: { name: true, email: true } },
    },
  });

  res.status(201).json({
    success: true,
    message: `Timetable slot created: ${slot.subject?.name ?? label ?? 'Free period'} — ${day} Period ${period} (${startTime}–${endTime})`,
    data: slot,
  });
});

// ─── GET /api/timetable ────────────────────────────────────────────────────────
// Fetch the full weekly timetable for a class, grouped by day for UI consumption.
exports.getClassTimetable = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { classId, academicSession, term } = req.query;

  if (!classId || !academicSession || !term) {
    return next(new ApiError(400, 'classId, academicSession, and term are required query params'));
  }

  // Validate class belongs to this tenant
  const classRecord = await prisma.class.findFirst({
    where: { id: classId, tenantId },
    select: { id: true, name: true, section: true },
  });
  if (!classRecord) return next(new ApiError(404, 'Class not found in this tenant'));

  const slots = await prisma.timetableSlot.findMany({
    where: { tenantId, classId, academicSession, term },
    orderBy: [{ day: 'asc' }, { period: 'asc' }],
    include: {
      subject: { select: { name: true, code: true } },
      teacher: { select: { name: true } },
    },
  });

  // Group by day for clean frontend consumption
  const grouped = VALID_DAYS.reduce((acc, d) => {
    acc[d] = slots
      .filter((s) => s.day === d)
      .map((s) => ({
        id:        s.id,
        period:    s.period,
        startTime: s.startTime,
        endTime:   s.endTime,
        subject:   s.subject?.name  ?? null,
        code:      s.subject?.code  ?? null,
        teacher:   s.teacher?.name  ?? null,
        label:     s.label          ?? null,
      }));
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    class: { id: classRecord.id, name: classRecord.name, section: classRecord.section },
    academicSession,
    term,
    timetable: grouped,
  });
});

// ─── DELETE /api/timetable/:id ────────────────────────────────────────────────
// Remove a single slot — tenantId scoping ensures no cross-tenant deletions.
exports.deleteSlot = catchAsync(async (req, res, next) => {
  const { tenantId } = req;
  const { id } = req.params;

  const slot = await prisma.timetableSlot.findFirst({
    where: { id, tenantId },            // ← double-scoped: id AND tenantId
  });
  if (!slot) return next(new ApiError(404, 'Timetable slot not found'));

  await prisma.timetableSlot.delete({ where: { id } });

  res.status(200).json({ success: true, message: 'Timetable slot deleted successfully' });
});
