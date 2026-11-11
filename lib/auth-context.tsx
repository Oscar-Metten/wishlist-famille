"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { authApi, type SessionUser } from "./api";
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  user: SessionUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null),
    [isLoading, setLoading] = useState(true);
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        setUser(await authApi.me());
      } catch {
        try {
          await authApi.refresh();
          setUser(await authApi.me());
        } catch {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const login = async (username: string, password: string) => {
    await authApi.login(username, password);
    setUser(await authApi.me());
  };
  const logout = async () => {
    await authApi.logout();
    setUser(null);
    router.push("/");
  };
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        username: user?.username || null,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("Contexte de connexion absent.");
  return value;
}
