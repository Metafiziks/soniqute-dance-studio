"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type AuthUser = {
  id: string;
  username: string;
  role?: "user" | "admin";
  isAdmin?: boolean;
  [key: string]: any; // allow extra fields from JWT/storage
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  // for when you handle the callback from X and store tokens
  setAuth: (data: { token: string; user: AuthUser } | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "sq_token";
const USER_KEY = "sq_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
      const rawUser =
        typeof window !== "undefined" ? localStorage.getItem(USER_KEY) : null;

      if (token && rawUser) {
        const parsed = JSON.parse(rawUser) as AuthUser;
        setUser(parsed);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error("Error reading auth from storage", e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setAuth = useCallback<AuthContextValue["setAuth"]>((data) => {
    if (typeof window === "undefined") return;

    if (!data) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
      return;
    }

    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        isLoading,
        user,
        setAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
