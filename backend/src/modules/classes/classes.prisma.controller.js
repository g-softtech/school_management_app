// Lives at: backend/src/modules/classes/classes.prisma.controller.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Example: Multi-tenant scoped controller using Prisma + req.tenantId
//
// This file demonstrates how every Prisma query is automatically scoped
// by injecting `tenantId` as a mandatory WHERE clause filter.
// No query can ever leak data across tenant boundaries.
// ─────────────────────────────────────────────────────────────────────────────

const prisma     = require('../../config/prisma');
const ApiError   = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');

// ─── GET /api/classes ─────────────────────────────────────────────────────────
// Returns all active classes that belong ONLY to the requesting tenant.
exports.getAllClasses = catchAsync(async (req, res, next) => {
  const { tenantId } = req;   // ← injected by tenantContext middleware

  const { academicYear, isActive, page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  // Build dynamic filters — all scoped under this tenant's ID
  const where = {
    tenantId,                                                     // ← MANDATORY isolation clause
    ...(academicYear && { academicYear }),
    ...(isActive !== undefined && { isActive: isActive === 'true' }),
  };

  // Run count and data fetch concurrently for performance
  const [total, classes] = await Promise.all([
    prisma.class.count({ where }),
    prisma.class.findMany({
      where,
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
      skip,
      take: Number(limit),
      include: {
        _count: { select: { students: true } },   // efficient inline student count
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    pagination: {
      total,
      page:  Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
    data: classes.map((cls) => ({
      ...cls,
      studentCount: cls._count.students,
      _count: undefined,
    })),
  });
});

// ─── POST /api/classes ────────────────────────────────────────────────────────
// Creates a new class, automatically stamped with the tenant's ID.
// It is impossible to create a class under a different tenant from this endpoint.
exports.createClass = catchAsync(async (req, res, next) => {
  const { tenantId } = req;   // ← injected by tenantContext middleware

  const { name, section, academicYear } = req.body;

  if (!name || !academicYear) {
    return next(new ApiError(400, 'Please provide class name and academicYear'));
  }

  // The composite unique index @@unique([tenantId, name, section, academicYear])
  // on the Prisma schema ensures no duplicate classes per tenant.
  const newClass = await prisma.class.create({
    data: {
      tenantId,       // ← tenant stamp — every record is scoped at creation time
      name,
      section:       section || null,
      academicYear,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Class created successfully',
    data: newClass,
  });
});

// ─── GET /api/students (registration example) ─────────────────────────────────
// Creates a new Student, correctly linked to the verified tenant.
exports.registerStudent = catchAsync(async (req, res, next) => {
  const { tenantId } = req;   // ← injected by tenantContext middleware

  const { userId, admissionNumber, gender, dateOfBirth, classId, parentId } = req.body;

  if (!userId || !admissionNumber || !gender || !dateOfBirth) {
    return next(new ApiError(400, 'userId, admissionNumber, gender, and dateOfBirth are required'));
  }

  // Verify the user being linked belongs to the SAME tenant — prevents
  // a malicious client from linking a student to a user from another school.
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId },   // ← double-scoped lookup
  });

  if (!user) {
    return next(new ApiError(404, 'User not found in this tenant'));
  }

  const student = await prisma.student.create({
    data: {
      tenantId,          // ← tenant stamp
      userId,
      admissionNumber,
      gender,
      dateOfBirth: new Date(dateOfBirth),
      classId:    classId  || null,
      parentId:   parentId || null,
    },
  });

  res.status(201).json({ success: true, message: 'Student registered successfully', data: student });
});
