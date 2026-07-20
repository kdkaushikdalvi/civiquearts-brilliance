import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: string | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_KEY = "isAuthenticated";
const USER_KEY = "authUser";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const auth = localStorage.getItem(AUTH_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (auth === "true") {
      setIsAuthenticated(true);
      setUser(u);
    }
  }, []);

  const login = (email: string, password: string) => {
    if (email === "test@gmail.com" && password === "123456") {
      localStorage.setItem(AUTH_KEY, "true");
      localStorage.setItem(USER_KEY, email);
      setIsAuthenticated(true);
      setUser(email);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(USER_KEY);
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
