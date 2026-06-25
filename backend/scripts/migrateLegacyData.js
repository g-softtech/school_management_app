require('dotenv').config();
const mongoose = require('mongoose');
const prisma = require('../src/config/prisma');

const CHUNK_SIZE = 50;

// The Linear ID-Mapping Memory Pattern
const idMap = {
  tenants: {},
  users: {},
  classes: {},
  students: {},
  feeStructures: {},
  invoices: {},
  subjects: {}
};

async function migrate() {
  console.log('====================================================');
  console.log('🚀 LEGACY MONGODB TO POSTGRESQL MULTI-TENANT ETL');
  console.log('====================================================\n');

  const mongoUri = process.env.OLD_MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('[ERROR] OLD_MONGODB_URI or MONGO_URI is not defined in .env');
    process.exit(1);
  }

  try {
    // 1. Dual-Database Connection
    console.log('[CONNECT] Connecting to Legacy MongoDB...');
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;
    console.log('[CONNECT] MongoDB connected.');

    console.log('[CONNECT] Validating PostgreSQL connection...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('[CONNECT] PostgreSQL connected.\n');

    // ─────────────────────────────────────────────────────────────────
    // Phase 1: Tenant Provisioning
    // ─────────────────────────────────────────────────────────────────
    console.log('--- [PHASE 1] Tenant Provisioning ---');
    
    // Check if default legacy tenant already exists (idempotency)
    let legacyTenant = await prisma.tenant.findUnique({ where: { domain: 'legacy' } });
    if (!legacyTenant) {
      legacyTenant = await prisma.tenant.create({
        data: {
          name: 'Legacy SmartSchool',
          domain: 'legacy',
        }
      });
      console.log(`[+] Created baseline tenant: ${legacyTenant.name} (cuid: ${legacyTenant.id})`);
    } else {
      console.log(`[i] Baseline tenant already exists: ${legacyTenant.name}`);
    }
    
    // Memory Map
    idMap.tenants['default'] = legacyTenant.id;
    const TENANT_ID = legacyTenant.id;
    console.log(`[PHASE 1] Complete.\n`);

    // ─────────────────────────────────────────────────────────────────
    // Phase 2: Users & Auth Credentials
    // ─────────────────────────────────────────────────────────────────
    console.log('--- [PHASE 2] Users Migration ---');
    const legacyUsers = await db.collection('users').find({}).toArray();
    console.log(`Found ${legacyUsers.length} users in legacy database.`);
    
    let userCount = 0;
    for (const oldUser of legacyUsers) {
      const email = (oldUser.email || '').toLowerCase();
      if (!email) continue; // Skip corrupted records

      // Ensure no duplicates exist in target
      let newUser = await prisma.user.findUnique({
        where: { tenantId_email: { tenantId: TENANT_ID, email: email } }
      });

      if (!newUser) {
        newUser = await prisma.user.create({
          data: {
            tenantId: TENANT_ID,
            name: oldUser.name || 'Unknown',
            email: email,
            password: oldUser.password || '$2b$12$dummyhash', // preserve bcrypt hash
            role: oldUser.role || 'student',
            phone: oldUser.phone || null,
            qualification: oldUser.qualification || null,
            isActive: oldUser.isActive !== false,
            createdAt: oldUser.createdAt || new Date(),
            updatedAt: oldUser.updatedAt || new Date()
          }
        });
        userCount++;
      }
      idMap.users[oldUser._id.toString()] = newUser.id;
    }
    console.log(`[PHASE 2] Successfully transformed and migrated ${userCount} users.\n`);

    // ─────────────────────────────────────────────────────────────────
    // Phase 3: Classes & Subjects
    // ─────────────────────────────────────────────────────────────────
    console.log('--- [PHASE 3] Classes & Subjects Migration ---');
    const legacyClasses = await db.collection('classes').find({}).toArray();
    console.log(`Found ${legacyClasses.length} classes in legacy database.`);
    
    let classCount = 0;
    for (const oldClass of legacyClasses) {
      let newClass = await prisma.class.findUnique({
        where: { tenantId_name_section_academicYear: { 
          tenantId: TENANT_ID, 
          name: oldClass.name, 
          section: oldClass.section || 'A', 
          academicYear: oldClass.academicYear || '2023/2024' 
        } }
      });

      if (!newClass) {
        newClass = await prisma.class.create({
          data: {
            tenantId: TENANT_ID,
            name: oldClass.name,
            section: oldClass.section || 'A',
            academicYear: oldClass.academicYear || '2023/2024',
            createdAt: oldClass.createdAt || new Date(),
            updatedAt: oldClass.updatedAt || new Date()
          }
        });
        classCount++;
      }
      idMap.classes[oldClass._id.toString()] = newClass.id;
    }
    console.log(`[PHASE 3] Successfully transformed and migrated ${classCount} classes.\n`);

    // ─────────────────────────────────────────────────────────────────
    // Phase 4: Student Profiles
    // ─────────────────────────────────────────────────────────────────
    console.log('--- [PHASE 4] Student Profiles Migration ---');
    const legacyStudents = await db.collection('students').find({}).toArray();
    console.log(`Found ${legacyStudents.length} students in legacy database.`);
    
    let studentCount = 0;
    for (const oldStudent of legacyStudents) {
      const mappedUserId = oldStudent.userId ? idMap.users[oldStudent.userId.toString()] : null;
      const mappedClassId = oldStudent.classId ? idMap.classes[oldStudent.classId.toString()] : null;

      // Admission number is unique per tenant
      let admissionNumber = oldStudent.admissionNumber || `ADM-${Math.floor(Math.random()*1000000)}`;

      if (mappedUserId && mappedClassId) {
        let newStudent = await prisma.student.findUnique({
          where: { tenantId_admissionNumber: { tenantId: TENANT_ID, admissionNumber: admissionNumber } }
        });

        if (!newStudent) {
          newStudent = await prisma.student.create({
            data: {
              tenantId: TENANT_ID,
              userId: mappedUserId,
              classId: mappedClassId,
              admissionNumber: admissionNumber,
              dateOfBirth: oldStudent.dateOfBirth || new Date('2010-01-01'),
              gender: oldStudent.gender || 'unknown',
              address: oldStudent.address || null,
              phone: oldStudent.phone || null,
              parentId: oldStudent.parentId ? idMap.users[oldStudent.parentId.toString()] : null,
              createdAt: oldStudent.createdAt || new Date(),
              updatedAt: oldStudent.updatedAt || new Date()
            }
          });
          studentCount++;
        }
        idMap.students[oldStudent._id.toString()] = newStudent.id;
      }
    }
    console.log(`[PHASE 4] Successfully transformed and migrated ${studentCount} students.\n`);

    // ─────────────────────────────────────────────────────────────────
    // Phase 5: Financials & Academic Ledger
    // ─────────────────────────────────────────────────────────────────
    console.log('--- [PHASE 5] Financials & Academic Records Migration ---');
    
    // 5A: Fee Structures
    const legacyFeeStructures = await db.collection('feestructures').find({}).toArray();
    console.log(`Found ${legacyFeeStructures.length} fee structures.`);
    let feeCount = 0;
    
    for (let i = 0; i < legacyFeeStructures.length; i += CHUNK_SIZE) {
      const chunk = legacyFeeStructures.slice(i, i + CHUNK_SIZE);
      const operations = [];

      for (const oldFee of chunk) {
        const mClassId = idMap.classes[oldFee.classId?.toString()];
        if (!mClassId) continue;

        const feeTypes = [
          { type: 'tuition', amount: oldFee.tuitionFee },
          { type: 'exam', amount: oldFee.examFee },
          { type: 'library', amount: oldFee.libraryFee },
          { type: 'sports', amount: oldFee.sportsFee },
          { type: 'development', amount: oldFee.developmentFee },
          { type: 'other', amount: oldFee.otherFees }
        ];

        for (const ft of feeTypes) {
          if (ft.amount > 0) {
            operations.push(prisma.feeStructure.create({
              data: {
                tenantId: TENANT_ID,
                name: `${ft.type.charAt(0).toUpperCase() + ft.type.slice(1)} Fee`,
                feeType: ft.type,
                amount: ft.amount,
                scope: 'specific_class',
                session: oldFee.academicYear || '2023/2024',
                term: oldFee.term || 'first',
                classId: mClassId,
                createdAt: oldFee.createdAt || new Date()
              }
            }));
            feeCount++;
          }
        }
      }
      
      // Execute chunk transactionally
      if (operations.length > 0) await prisma.$transaction(operations);
    }
    console.log(`  -> Migrated ${feeCount} fee structures in chunks.`);

    // 5B: Invoices
    const legacyInvoices = await db.collection('invoices').find({}).toArray();
    console.log(`Found ${legacyInvoices.length} invoices.`);
    let invoiceCount = 0;
    
    for (let i = 0; i < legacyInvoices.length; i += CHUNK_SIZE) {
      const chunk = legacyInvoices.slice(i, i + CHUNK_SIZE);
      const invoiceOps = [];

      for (const oldInv of chunk) {
        const mStudentId = idMap.students[oldInv.studentId?.toString()];
        const mClassId = idMap.classes[oldInv.classId?.toString()];
        if (!mStudentId || !mClassId) continue;

        invoiceOps.push(prisma.invoice.create({
          data: {
            tenantId: TENANT_ID,
            studentId: mStudentId,
            classId: mClassId,
            term: oldInv.term || 'first',
            session: oldInv.session || '2023/2024',
            dueDate: oldInv.dueDate || new Date(),
            status: oldInv.status === 'paid' ? 'paid' : (oldInv.status === 'partial' ? 'partial' : 'unpaid'),
            createdAt: oldInv.createdAt || new Date(),
            // Line items would normally be transformed here as well, but for legacy compatibility
            // we initialize empty and allow ledger rebuilding if needed
            items: {
              create: [
                { feeType: 'tuition', amount: oldInv.totalAmount || 0 }
              ]
            }
          }
        }));
        invoiceCount++;
      }
      
      if (invoiceOps.length > 0) await prisma.$transaction(invoiceOps);
    }
    console.log(`  -> Migrated ${invoiceCount} invoices safely in chunks.\n`);

    console.log('====================================================');
    console.log('🎉 ETL PIPELINE COMPLETE! No connection bleeding.');
    console.log('====================================================');

  } catch (err) {
    console.error('[CRITICAL ERROR] Pipeline failed:', err);
  } finally {
    await mongoose.disconnect();
    await prisma.$disconnect();
    process.exit(0);
  }
}

migrate();
