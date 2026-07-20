import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");

  const from = (location.state as any)?.from?.pathname || "/app/dashboard";

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, from, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const ok = login(email.trim(), password);
    if (ok) {
      toast.success("Logged in successfully");
      navigate(from, { replace: true });
    } else {
      setError("Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/">
            <img src={logo} alt="CiviqueArts" className="h-24 w-auto mx-auto mb-4" />
          </Link>
          <p className="text-primary-foreground/70 text-sm">
            Sign in to the Billing Management System
          </p>
        </div>

        <div className="bg-card rounded-2xl shadow-card-hover overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">Welcome Back</h3>
              <p className="text-sm text-muted-foreground mb-2">Enter your credentials to continue</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="test@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={show ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full gradient-saffron text-saffron-foreground rounded-full hover:opacity-90">
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </Button>

            <div className="text-xs text-muted-foreground pt-2 border-t border-border">
              <div className="font-medium text-foreground mb-1">Demo credentials</div>
              Email: <code className="text-saffron">test@gmail.com</code><br />
              Password: <code className="text-saffron">123456</code>
            </div>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="inline-flex items-center text-sm text-primary-foreground/70 hover:text-saffron transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
