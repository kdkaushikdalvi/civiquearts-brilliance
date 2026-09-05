import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Eye, EyeOff, LogIn, UserPlus, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const LoginPage = () => {
  const { login, signUp, resetPassword, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/app/projects";

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, authLoading, from, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await login(identifier.trim(), password);
    setBusy(false);
    if (res.ok) {
      toast.success("Logged in successfully");
      navigate(from, { replace: true });
    } else {
      setError(res.error || "Invalid credentials.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const digits = mobile.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Enter a valid mobile number (at least 10 digits).");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    const res = await signUp(email.trim(), password, fullName.trim(), digits);
    setBusy(false);
    if (res.ok) {
      toast.success("Account created. Please check your email to confirm, then sign in.");
      setTab("login");
    } else {
      setError(res.error || "Sign up failed.");
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await resetPassword(resetEmail.trim());
    setBusy(false);
    if (res.ok) {
      toast.success("Password reset link sent. Please check your email.");
      setTab("login");
    } else {
      setError(res.error || "Could not send reset email.");
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
          <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(""); }} className="w-full">
            <TabsList className="w-full grid grid-cols-2 rounded-none">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="p-6 space-y-4 mt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Welcome Back</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Enter your credentials to continue
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-id">Email or Mobile Number</Label>
                  <Input
                    id="login-id"
                    type="text"
                    placeholder="you@example.com or 9876543210"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input id="login-password" type={show ? "text" : "password"}
                      placeholder="••••••••" value={password}
                      onChange={(e) => setPassword(e.target.value)} required className="pr-10" />
                    <button type="button" onClick={() => setShow((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={show ? "Hide password" : "Show password"}>
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setTab("forgot"); setError(""); }}
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    Forgot password?
                  </button>
                </div>
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button type="submit" disabled={busy}
                  className="w-full gradient-saffron text-saffron-foreground rounded-full hover:opacity-90">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="p-6 space-y-4 mt-0">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Create Account</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Register to access the billing system
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full Name</Label>
                  <Input id="su-name" value={fullName}
                    onChange={(e) => setFullName(e.target.value)} required maxLength={100} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-mobile">Mobile Number</Label>
                  <Input id="su-mobile" type="tel" inputMode="tel" placeholder="9876543210"
                    value={mobile} onChange={(e) => setMobile(e.target.value)} required maxLength={15} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-password">Password</Label>
                  <Input id="su-password" type="password" placeholder="At least 6 characters"
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                </div>
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button type="submit" disabled={busy}
                  className="w-full gradient-saffron text-saffron-foreground rounded-full hover:opacity-90">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Register
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="forgot" className="p-6 space-y-4 mt-0">
              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">Forgot Password</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    We'll email you a link to reset your password
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fp-email">Email</Label>
                  <Input id="fp-email" type="email" value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)} required />
                </div>
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Button type="submit" disabled={busy}
                  className="w-full gradient-saffron text-saffron-foreground rounded-full hover:opacity-90">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send Reset Link
                </Button>
                <button type="button" onClick={() => { setTab("login"); setError(""); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground">
                  Back to Sign In
                </button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center mt-6">
          <Link to="/"
            className="inline-flex items-center text-sm text-primary-foreground/70 hover:text-saffron transition-colors">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
