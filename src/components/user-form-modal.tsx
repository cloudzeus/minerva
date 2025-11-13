"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role, User } from "@prisma/client";
import { createUser, updateUser } from "@/app/actions/users";
import { toast } from "sonner";
import { FaSave, FaTimes } from "react-icons/fa";

const userFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional().or(z.literal("")),
  role: z.enum([Role.ADMIN, Role.MANAGER, Role.EMPLOYEE]),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface UserFormModalProps {
  mode: "create" | "edit";
  user?: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormModal({ mode, user, open, onOpenChange }: UserFormModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      role: user?.role || Role.EMPLOYEE,
    },
  });

  async function onSubmit(values: UserFormValues) {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("email", values.email);
      if (values.password) {
        formData.append("password", values.password);
      }
      formData.append("role", values.role);

      const result =
        mode === "create"
          ? await createUser(formData)
          : await updateUser(user!.id, formData);

      if (result.success) {
        toast.success(
          mode === "create" ? "User created" : "User updated",
          {
            description: `${values.email} has been ${
              mode === "create" ? "created" : "updated"
            } successfully`,
          }
        );
        onOpenChange(false);
        form.reset();
        router.refresh();
      } else {
        toast.error("Operation failed", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base uppercase">
            {mode === "create" ? "Create New User" : "Edit User"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {mode === "create"
              ? "Add a new user to the system"
              : "Update user information and permissions"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" className="text-sm" {...field} />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="john.doe@example.com"
                      className="text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">
                    Password {mode === "edit" && "(leave blank to keep current)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs uppercase">Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={Role.ADMIN} className="text-sm">ADMIN</SelectItem>
                      <SelectItem value={Role.MANAGER} className="text-sm">MANAGER</SelectItem>
                      <SelectItem value={Role.EMPLOYEE} className="text-sm">EMPLOYEE</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isLoading} size="sm" className="flex-1 text-xs">
                <FaSave className="mr-2 h-3 w-3" />
                {isLoading
                  ? mode === "create"
                    ? "CREATING..."
                    : "UPDATING..."
                  : mode === "create"
                  ? "CREATE USER"
                  : "UPDATE USER"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => onOpenChange(false)}
              >
                <FaTimes className="mr-2 h-3 w-3" />
                CANCEL
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

