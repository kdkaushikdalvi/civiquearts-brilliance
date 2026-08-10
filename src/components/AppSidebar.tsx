import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  Info,
  Briefcase,
  FolderOpen,
  Users,
  LogIn,
  ChevronDown,
  Menu,
  X,
  RefreshCw,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const sidebarItems = [
  { label: "HOME", href: "#home", icon: Home },
  {
    label: "ABOUT US",
    href: "#about",
    icon: Info,
    children: [
      { label: "Company Overview", href: "#about" },
      { label: "Mission & Vision", href: "#about" },
      { label: "Our Team", href: "#about" },
    ],
  },
  {
    label: "SERVICES",
    href: "#services",
    icon: Briefcase,
    children: [
      { label: "Engineering Design", href: "#services" },
      { label: "CAD Drafting", href: "#services" },
      { label: "GIS Mapping", href: "#services" },
      { label: "BIM Modeling", href: "#services" },
      { label: "MEP Design", href: "#services" },
    ],
  },
  {
    label: "OUR SAMPLES",
    href: "#samples",
    icon: FolderOpen,
    children: [
      { label: "Engineering Projects", href: "#samples" },
      { label: "Design Portfolio", href: "#samples" },
      { label: "Client Case Studies", href: "#samples" },
    ],
  },
  { label: "CAREER", href: "#career", icon: Users },
  {
    label: "LOGIN",
    href: "/login",
    icon: LogIn,
    isRoute: true,
    children: [
      { label: "Login", href: "/login" },
      { label: "Register", href: "/login" },
    ],
  },
];

const AppSidebar = () => {
  const [open, setOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const toggleExpand = (label: string) => {
    setExpandedItem(expandedItem === label ? null : label);
  };

  const handleReload = () => {
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    toast.success("Cache cleared! Reloading...");
    setTimeout(() => window.location.reload(), 500);
  };

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        toast.success("App installed successfully!");
      }
      setDeferredPrompt(null);
    } else {
      toast.info(
        "To install: use your browser's 'Add to Home Screen' or 'Install App' option.",
      );
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 w-10 h-10 rounded-r-xl gradient-saffron text-saffron-foreground flex items-center justify-center shadow-lg hover:w-12 transition-all duration-300"
        aria-label="Toggle sidebar"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-card shadow-card-hover border-r border-border flex flex-col"
          >
            {/* Header with Logo */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <img src={logo} alt="CiviqueArts" className="h-12 w-auto" />
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Menu items */}
            <nav className="flex-1 overflow-y-auto py-2">
              {sidebarItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center">
                    {item.isRoute ? (
                      <Link
                        to={item.href}
                        onClick={() => setOpen(false)}
                        className="flex-1 flex items-center gap-3 px-5 py-3 text-sm font-medium tracking-wide text-foreground hover:bg-secondary hover:text-saffron transition-colors"
                      >
                        <item.icon className="h-4 w-4 text-saffron" />
                        {item.label}
                      </Link>
                    ) : (
                      <a
                        href={item.href}
                        onClick={() => !item.children && setOpen(false)}
                        className="flex-1 flex items-center gap-3 px-5 py-3 text-sm font-medium tracking-wide text-foreground hover:bg-secondary hover:text-saffron transition-colors"
                      >
                        <item.icon className="h-4 w-4 text-saffron" />
                        {item.label}
                      </a>
                    )}
                    {item.children && (
                      <button
                        onClick={() => toggleExpand(item.label)}
                        className="px-3 py-3 text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            expandedItem === item.label ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {item.children && expandedItem === item.label && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden bg-secondary/30"
                      >
                        {item.children.map((child) =>
                          item.isRoute ? (
                            <Link
                              key={child.label}
                              to={child.href}
                              onClick={() => setOpen(false)}
                              className="block pl-12 pr-5 py-2.5 text-sm text-muted-foreground hover:text-saffron transition-colors"
                            >
                              {child.label}
                            </Link>
                          ) : (
                            <a
                              key={child.label}
                              href={child.href}
                              onClick={() => setOpen(false)}
                              className="block pl-12 pr-5 py-2.5 text-sm text-muted-foreground hover:text-saffron transition-colors"
                            >
                              {child.label}
                            </a>
                          ),
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              {/* Divider */}
              <div className="my-3 mx-5 border-t border-border" />

              {/* Reload App */}
              <button
                onClick={handleReload}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium tracking-wide text-foreground hover:bg-secondary hover:text-saffron transition-colors"
              >
                <RefreshCw className="h-4 w-4 text-saffron" />
                RELOAD APP
              </button>

              {/* Install App */}
              <button
                onClick={handleInstall}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm font-medium tracking-wide text-foreground hover:bg-secondary hover:text-saffron transition-colors"
              >
                <Download className="h-4 w-4 text-saffron" />
                INSTALL APP
              </button>
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border text-xs text-muted-foreground text-center">
              © {new Date().getFullYear()} CiviqueArts
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default AppSidebar;
