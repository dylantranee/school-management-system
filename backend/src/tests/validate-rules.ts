import prisma from '../config/db';
import { enrollmentService } from '../modules/enrollments/enrollments.service';
import { salariesService } from '../modules/salaries/salaries.service';
import crypto from 'crypto';

async function runTests() {
  console.log("====================================================");
  console.log("   🚀 SMS SENIOR TESTER AUTOMATED VALIDATION RUN   ");
  console.log("====================================================");

  let passed = 0;
  let failed = 0;

  function assert(title: string, condition: boolean) {
    if (condition) {
      console.log(`[PASS] ✓ ${title}`);
      passed++;
    } else {
      console.log(`[FAIL] ✗ ${title}`);
      failed++;
    }
  }

  // Define unique IDs for test setup
  const staffUserId = crypto.randomUUID();
  const staffId = crypto.randomUUID();
  const studentUserId = crypto.randomUUID();
  const studentId = crypto.randomUUID();
  const subjectId = crypto.randomUUID();
  const courseSectionId = crypto.randomUUID();
  const enrollmentId = crypto.randomUUID();

  // Seeding temp records for Test 1
  try {
    // 1. Create Staff User & Profile (Advisor)
    await prisma.users.create({
      data: {
        id: staffUserId,
        email: `test_advisor_${staffId}@test.com`,
        password_hash: 'hash',
        role: 'Staff'
      }
    });

    await prisma.staff.create({
      data: {
        id: staffId,
        employee_code: `CODE_${staffId.slice(0, 8)}`,
        staff_first_name: 'Test',
        staff_last_name: 'Advisor',
        department: 'Computer Science',
        user_id: staffUserId
      }
    });

    // 2. Create Student User & Profile (linked to Advisor)
    await prisma.users.create({
      data: {
        id: studentUserId,
        email: `test_student_${studentId}@test.com`,
        password_hash: 'hash',
        role: 'Student'
      }
    });

    await prisma.student.create({
      data: {
        id: studentId,
        student_code: `STUD_${studentId.slice(0, 8)}`,
        student_first_name: 'Test',
        student_last_name: 'Student',
        user_id: studentUserId,
        advisor_id: staffId
      }
    });

    // 3. Create Subject & Course Section
    await prisma.subject.create({
      data: {
        id: subjectId,
        subject_code: `SUBJ_${subjectId.slice(0, 8)}`,
        subject_name: 'Test Subject',
        credits: 3
      }
    });

    await prisma.course_Section.create({
      data: {
        id: courseSectionId,
        semester: 'SEMESTER_1',
        academic_year: 2026,
        section_number: 'SEC01',
        max_capacity: 30,
        subject_id: subjectId,
        staff_id: staffId
      }
    });

    // 4. Create Student Enrollment
    await prisma.student_Enrollment.create({
      data: {
        id: enrollmentId,
        student_id: studentId,
        course_section_id: courseSectionId,
        enrollment_status: 'pending'
      }
    });

    // TEST 1: Validate Advisor Non-Null Restriction (Admin fallback approval check)
    try {
      // Attempt to approve as Admin role - should throw 403 Forbidden since fallback is removed
      await enrollmentService.updateEnrollmentStatus(
        enrollmentId,
        'approving',
        'admin-user-id',
        'Admin'
      );
      assert("SMS-9 Scenario 5: Admin fallback approval check (Blocked)", false);
    } catch (err: any) {
      assert(
        `SMS-9 Scenario 5: Admin fallback approval check (Blocked with Status ${err.statusCode || err.status})`,
        (err.statusCode === 403 || err.status === 403)
      );
    }

  } catch (err) {
    console.error("❌ Setup or execution error in Test 1:", err);
    failed++;
  }

  // TEST 2: Validate Payroll Non-Negative Inputs
  try {
    try {
      await salariesService.createSalary('admin-user-id', {
        base_salary: -500, // Negative base salary
        allowances: 100,
        deductions: 50,
        payment_month: 6,
        payment_year: 2026,
        staff_id: staffId
      });
      assert("SMS-12 Scenario 1: Negative salary input check (Blocked)", false);
    } catch (err: any) {
      assert(
        `SMS-12 Scenario 1: Negative salary input check (Blocked with Status ${err.statusCode || err.status})`,
        (err.statusCode === 400 || err.status === 400)
      );
    }
  } catch (err) {
    console.error("❌ Error in Test 2:", err);
    failed++;
  }

  // TEST 3: Validate Payroll Net Salary Calculation Constraint (> 0)
  try {
    try {
      await salariesService.createSalary('admin-user-id', {
        base_salary: 1000,
        allowances: 200,
        deductions: 1300, // Results in net_salary = -100
        payment_month: 6,
        payment_year: 2026,
        staff_id: staffId
      });
      assert("SMS-12 Scenario 1: Net salary <= 0 check (Blocked)", false);
    } catch (err: any) {
      assert(
        `SMS-12 Scenario 1: Net salary <= 0 check (Blocked with Status ${err.statusCode || err.status})`,
        (err.statusCode === 400 || err.status === 400)
      );
    }
  } catch (err) {
    console.error("❌ Error in Test 3:", err);
    failed++;
  }

  // CLEANUP Phase
  console.log("🧹 Cleaning up database test records...");
  try {
    await prisma.student_Enrollment.deleteMany({ where: { id: enrollmentId } });
    await prisma.course_Section.deleteMany({ where: { id: courseSectionId } });
    await prisma.subject.deleteMany({ where: { id: subjectId } });
    await prisma.student.deleteMany({ where: { id: studentId } });
    await prisma.staff.deleteMany({ where: { id: staffId } });
    await prisma.users.deleteMany({ where: { id: { in: [studentUserId, staffUserId] } } });
    console.log("✓ Cleanup finished successfully.");
  } catch (err) {
    console.error("❌ Failed to clean up temp test records:", err);
  }

  console.log("====================================================");
  console.log(`📊 Validation Results: ${passed} Passed, ${failed} Failed`);
  console.log("====================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
