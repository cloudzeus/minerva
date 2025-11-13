"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/auth-helpers";

export async function createUser(formData: FormData) {
  await requireRole(Role.ADMIN);

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as Role;

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
    });

    // Log activity
    const currentUser = await requireRole(Role.ADMIN);
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "USER_CREATED",
        description: `Created user ${email} with role ${role}`,
      },
    });

    revalidatePath("/admin/users");
    return { success: true, userId: user.id };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Email already exists" };
    }
    return { success: false, error: "Failed to create user" };
  }
}

export async function updateUser(userId: string, formData: FormData) {
  await requireRole(Role.ADMIN);

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const role = formData.get("role") as Role;
  const password = formData.get("password") as string | null;

  try {
    const updateData: any = { name, email, role };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    // Log activity
    const currentUser = await requireRole(Role.ADMIN);
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "USER_UPDATED",
        description: `Updated user ${email}`,
      },
    });

    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${userId}`);
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "Email already exists" };
    }
    return { success: false, error: "Failed to update user" };
  }
}

export async function deleteUser(userId: string) {
  await requireRole(Role.ADMIN);

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { success: false, error: "User not found" };
    }

    await prisma.user.delete({ where: { id: userId } });

    // Log activity
    const currentUser = await requireRole(Role.ADMIN);
    await prisma.activityLog.create({
      data: {
        userId: currentUser.id,
        type: "USER_DELETED",
        description: `Deleted user ${user.email}`,
      },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to delete user" };
  }
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  await requireRole(Role.ADMIN);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    return { success: false, error: "Failed to update user status" };
  }
}

