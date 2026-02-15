"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { register as apiRegister, login as apiLogin, logout as apiLogout, me, type AuthUser } from "@/lib/api";

const STORAGE_KEY = "mahm_user_id";

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  register: (name: string, email?: string) => Promise<void>;
  login: (by: { email?: string; user_id?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredUser = useCallback(async () => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!stored) {
      setIsLoading(false);
      return;
    }
    try {
      const u = await me(stored);
      setUser(u);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredUser();
  }, [loadStoredUser]);

  const register = useCallback(async (name: string, email?: string) => {
    const u = await apiRegister(name, email);
    setUser(u);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, u.user_id);
  }, []);

  const login = useCallback(async (by: { email?: string; user_id?: string }) => {
    const { user_id } = await apiLogin(by);
    const u = await me(user_id);
    setUser(u);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, user_id);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      /* ignore */
    }
    setUser(null);
    if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
