"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { toast } from "sonner";
import { handleLogin } from "@/app/actions/auth";

export function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await handleLogin(formData);

      if (result.success) {
        toast.success("Login successful!", {
          description: "Redirecting to your dashboard...",
        });
        router.refresh();
      } else {
        toast.error("Login failed", {
          description: result.error || "Invalid credentials",
        });
      }
    } catch (error) {
      toast.error("An error occurred", {
        description: "Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4">
          <img 
            src="https://wwa-espa.b-cdn.net/crm/minervaLogo.png" 
            alt="MINERVA" 
            className="h-[68px] w-auto mx-auto"
          />
        </div>
        <CardDescription className="text-xs">
          Enter your credentials to access the system
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase">EMAIL</Label>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@minerva.com"
                required
                className="pl-9 text-sm"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase">PASSWORD</Label>
            <div className="relative">
              <FaLock className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="pl-9 text-sm"
                disabled={isLoading}
              />
            </div>
          </div>
          <Button type="submit" className="w-full text-sm" disabled={isLoading}>
            {isLoading ? "SIGNING IN..." : "SIGN IN"}
          </Button>
        </form>
        
        {/* Powered By Section */}
        <div className="mt-6 flex flex-col items-center gap-2 border-t pt-4">
          <p className="text-[9px] text-muted-foreground">Powered by</p>
          <img 
            src="https://kimoncrm.b-cdn.net/company/logo/1759767599592-ecy9f9.svg" 
            alt="AIC" 
            className="h-[48px] w-auto"
          />
        </div>
      </CardContent>
    </Card>
  );
}

