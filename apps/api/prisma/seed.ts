import { PrismaClient, UserRole, EmployeeStatus, EmploymentType } from '@prisma/client';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Departments
  const departments = [
    { name: 'Information Technology', code: 'IT', description: 'Tech and Infrastructure' },
    { name: 'Human Resources', code: 'HR', description: 'Personnel and Culture' },
    { name: 'Finance', code: 'FIN', description: 'Accounting and Payroll' },
    { name: 'Operations', code: 'OPS', description: 'Business Operations' },
    { name: 'Sales & Marketing', code: 'S&M', description: 'Revenue and Growth' },
    { name: 'Administration', code: 'ADM', description: 'General Admin' }
  ];

  const createdDepts = [];
  for (const dept of departments) {
    const d = await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept
    });
    createdDepts.push(d);
  }
  console.log('Departments created');

  // 2. Create Designations for each department
  const designations = [
    { name: 'Software Engineer', grade: 'L1' },
    { name: 'Senior Software Engineer', grade: 'L2' },
    { name: 'HR Manager', grade: 'M1' },
    { name: 'Accountant', grade: 'L1' },
    { name: 'Operations Lead', grade: 'M2' },
    { name: 'Sales Executive', grade: 'L1' }
  ];

  const createdDesignations = [];
  for (const dept of createdDepts) {
    for (const des of designations) {
      const d = await prisma.designation.create({
        data: {
          name: des.name,
          grade: des.grade,
          departmentId: dept.id
        }
      });
      createdDesignations.push(d);
    }
  }
  console.log('Designations created');

  // 3. Create Leave Types
  const leaveTypes = [
    { name: 'Casual Leave', totalDays: 14, carryForward: false },
    { name: 'Sick Leave', totalDays: 10, carryForward: true },
    { name: 'Annual Leave', totalDays: 20, carryForward: true },
    { name: 'Maternity Leave', totalDays: 90, carryForward: false },
    { name: 'Paternity Leave', totalDays: 7, carryForward: false }
  ];

  const createdLeaveTypes = [];
  for (const lt of leaveTypes) {
    const l = await prisma.leaveType.upsert({
      where: { name: lt.name },
      update: {},
      create: lt
    });
    createdLeaveTypes.push(l);
  }
  console.log('Leave Types created');

  // 4. Create Shifts
  const shifts = [
    { name: 'General Shift', startTime: '09:00', endTime: '18:00', isDefault: true },
    { name: 'Morning Shift', startTime: '06:00', endTime: '15:00' },
    { name: 'Evening Shift', startTime: '14:00', endTime: '23:00' }
  ];

  const createdShifts = [];
  for (const s of shifts) {
    const createdShift = await prisma.shift.upsert({
      where: { name: s.name },
      update: {},
      create: s
    });
    createdShifts.push(createdShift);
  }
  console.log('Shifts created');

  // 5. Create 50 Employees
  console.log('Creating 50 employees...');
  for (let i = 0; i < 50; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    
    // Create User
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: i === 0 ? UserRole.SUPER_ADMIN : (i < 5 ? UserRole.HR_ADMIN : (i < 10 ? UserRole.MANAGER : UserRole.EMPLOYEE))
      }
    });

    const dept = createdDepts[i % createdDepts.length];
    if (!dept) continue;

    const design = createdDesignations.find(d => d.departmentId === dept.id);
    if (!design) continue;
    
    // Create Employee
    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeId: `EMP-${(i + 1).toString().padStart(3, '0')}`,
        firstName,
        lastName,
        fatherName: faker.person.fullName({ sex: 'male' }),
        motherName: faker.person.fullName({ sex: 'female' }),
        dateOfBirth: faker.date.birthdate({ min: 20, max: 50, mode: 'age' }),
        gender: faker.helpers.arrayElement(['Male', 'Female']),
        maritalStatus: faker.helpers.arrayElement(['Single', 'Married']),
        nationalId: faker.string.numeric(10),
        phone: faker.phone.number(),
        emergencyContact: faker.phone.number(),
        presentAddress: faker.location.streetAddress(),
        permanentAddress: faker.location.streetAddress(),
        joinDate: faker.date.past({ years: 5 }),
        status: EmployeeStatus.ACTIVE,
        employmentType: faker.helpers.arrayElement([EmploymentType.FULL_TIME, EmploymentType.CONTRACT]),
        departmentId: dept.id,
        designationId: design.id,
        shiftId: createdShifts[0]?.id
      }
    });

    // Create Leave Balances
    for (const lt of createdLeaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          leaveTypeId: lt.id,
          year: 2026,
          allocated: lt.totalDays,
          used: 0,
          remaining: lt.totalDays
        }
      });
    }

    // Create Salary Structure
    await prisma.salaryStructure.create({
      data: {
        employeeId: employee.id,
        basicSalary: faker.number.int({ min: 30000, max: 150000 }),
        houseRentPercent: 40,
        medicalPercent: 10,
        transportAllowance: 5000,
        effectiveFrom: employee.joinDate
      }
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
