import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authApi } from "@/lib/api";

// User type definition
export interface User {
  userId: string;
  username: string;
  fullName: string;
  role: "OWNER" | "PARTNER" | "STAFF";
  permissions: string[]; // RBAC: Sidebar permissions
  walletBalance: number;
  floatingCash: number;
  pendingDebt: number;
  phone?: string;
  email?: string;
  isActive: boolean;
  lastLogin?: string;
}

// Context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already authenticated (on app load)
  const checkAuth = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.getMe();
      setUser(response.user);
    } catch (err: any) {
      // If not authenticated, just set user to null
      setUser(null);
      console.log("No active session");
    } finally {
      setLoading(false);
    }
  };

  // Login function
  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.login(username, password);
      setUser(response.user);
    } catch (err: any) {
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await authApi.logout();
      setUser(null);
    } catch (err: any) {
      console.error("Logout error:", err);
      // Even if logout fails, clear local state
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-login check on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, login, logout, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
