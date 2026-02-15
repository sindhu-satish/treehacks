"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MahmLogo } from "@/components/brand/MahmLogo";
import { useAuth } from "@/contexts/AuthContext";

interface LoginModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function LoginModal({ onClose, onSuccess }: LoginModalProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Enter your email");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await login({ email: email.trim(), password });
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed. Try creating an account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAccount = () => {
    onClose();
    router.push("/onboarding");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <Card
        className="w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <MahmLogo size="md" />
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <h2 className="font-display text-xl font-bold text-foreground mb-2">Log in</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Enter your email to access your profile and sync across devices
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:border-primary"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:border-primary"
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full gradient-coral text-white font-bold py-6"
          >
            {isLoading ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <button
            onClick={handleCreateAccount}
            className="text-sm text-primary hover:underline font-medium"
          >
            New here? Create an account
          </button>
        </div>
      </Card>
    </div>
  );
}
