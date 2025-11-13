import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create Admin user
  const adminPassword = await bcrypt.hash("1f1femsk", 12);
  const admin = await prisma.user.upsert({
    where: { email: "gkozyris@aic.gr" },
    update: {},
    create: {
      email: "gkozyris@aic.gr",
      name: "Admin User",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // Create Manager user
  const managerPassword = await bcrypt.hash("Manager123!", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@minerva.com" },
    update: {},
    create: {
      email: "manager@minerva.com",
      name: "Manager User",
      passwordHash: managerPassword,
      role: Role.MANAGER,
      isActive: true,
    },
  });
  console.log("✅ Manager user created:", manager.email);

  // Create Employee user
  const employeePassword = await bcrypt.hash("Employee123!", 12);
  const employee = await prisma.user.upsert({
    where: { email: "employee@minerva.com" },
    update: {},
    create: {
      email: "employee@minerva.com",
      name: "Employee User",
      passwordHash: employeePassword,
      role: Role.EMPLOYEE,
      isActive: true,
    },
  });
  console.log("✅ Employee user created:", employee.email);

  // Create some sample activity logs
  const activityLogs = [
    {
      userId: admin.id,
      type: "LOGIN" as const,
      description: "Admin logged in",
    },
    {
      userId: manager.id,
      type: "LOGIN" as const,
      description: "Manager logged in",
    },
    {
      userId: employee.id,
      type: "LOGIN" as const,
      description: "Employee logged in",
    },
    {
      userId: admin.id,
      type: "USER_CREATED" as const,
      description: "Created a new user",
    },
  ];

  for (const log of activityLogs) {
    await prisma.activityLog.create({ data: log });
  }
  console.log("✅ Activity logs created");

  console.log("\n🎉 Seed completed successfully!");
  console.log("\n📋 Default user credentials:");
  console.log("─────────────────────────────────────");
  console.log("ADMIN:");
  console.log("  Email: admin@minerva.com");
  console.log("  Password: Admin123!");
  console.log("\nMANAGER:");
  console.log("  Email: manager@minerva.com");
  console.log("  Password: Manager123!");
  console.log("\nEMPLOYEE:");
  console.log("  Email: employee@minerva.com");
  console.log("  Password: Employee123!");
  console.log("─────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

