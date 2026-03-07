import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, LogIn, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

type Tab = "login" | "register" | "admin";

const LoginPage = () => {
  const [tab, setTab] = useState<Tab>("login");
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [adminForm, setAdminForm] = useState({ email: "", password: "" });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Login feature coming soon!");
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    toast.success("Registration feature coming soon!");
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Admin login feature coming soon!");
  };

  const tabs = [
    { id: "login" as Tab, label: "User Login", icon: LogIn },
    { id: "register" as Tab, label: "Register", icon: UserPlus },
    { id: "admin" as Tab, label: "Admin Login", icon: Shield },
  ];

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src={logo} alt="CiviqueArts" className="h-24 w-auto mx-auto mb-4" />
          </Link>
          <p className="text-primary-foreground/70 text-sm">
            Access your CiviqueArts account
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-card-hover overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "text-saffron border-b-2 border-saffron bg-secondary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Login Form */}
            {tab === "login" && (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <h3 className="text-xl font-bold text-foreground mb-1">Welcome Back</h3>
                <p className="text-sm text-muted-foreground mb-4">Sign in to your account</p>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <a href="#" className="text-xs text-saffron hover:underline">Forgot Password?</a>
                </div>
                <Button type="submit" className="w-full gradient-saffron text-saffron-foreground rounded-full hover:opacity-90">
                  <LogIn className="mr-2 h-4 w-4" /> Sign In
                </Button>
              </motion.form>
            )}

            {/* Register Form */}
            {tab === "register" && (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <h3 className="text-xl font-bold text-foreground mb-1">Create Account</h3>
                <p className="text-sm text-muted-foreground mb-4">Join CiviqueArts today</p>
                <div className="space-y-2">
                  <Label htmlFor="reg-name">Full Name</Label>
                  <Input
                    id="reg-name"
                    placeholder="John Doe"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-phone">Phone</Label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={registerForm.phone}
                    onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-pass">Password</Label>
                    <Input
                      id="reg-pass"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm">Confirm</Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full gradient-green text-green-accent-foreground rounded-full hover:opacity-90">
                  <UserPlus className="mr-2 h-4 w-4" /> Create Account
                </Button>
              </motion.form>
            )}

            {/* Admin Login Form */}
            {tab === "admin" && (
              <motion.form
                key="admin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleAdminLogin}
                className="space-y-4"
              >
                <h3 className="text-xl font-bold text-foreground mb-1">Admin Access</h3>
                <p className="text-sm text-muted-foreground mb-4">Authorized personnel only</p>
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@civiquearts.com"
                    value={adminForm.email}
                    onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    placeholder="••••••••"
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full bg-primary text-primary-foreground rounded-full hover:opacity-90">
                  <Shield className="mr-2 h-4 w-4" /> Admin Sign In
                </Button>
              </motion.form>
            )}
          </div>
        </div>

        {/* Back link */}
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
