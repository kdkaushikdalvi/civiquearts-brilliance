import { useState, useEffect } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

const menuItems = [
  { label: "HOME", href: "#home" },
  {
    label: "ABOUT US",
    href: "#about",
    children: [
      { label: "Company Overview", href: "#about" },
      { label: "Mission & Vision", href: "#about" },
      { label: "Our Team", href: "#about" },
    ],
  },
  {
    label: "SERVICES",
    href: "#services",
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
    children: [
      { label: "Engineering Projects", href: "#samples" },
      { label: "Design Portfolio", href: "#samples" },
      { label: "Client Case Studies", href: "#samples" },
    ],
  },
  { label: "CAREER", href: "#career" },
  {
    label: "LOGIN",
    href: "/login",
    isRoute: true,
    children: [
      { label: "Login", href: "/login", isRoute: true },
      { label: "Register", href: "/login", isRoute: true },
    ],
  },
];

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-primary/95 backdrop-blur-md shadow-card"
          : "bg-primary/90 backdrop-blur-sm"
      }`}
    >
      {/* Tricolor top bar */}
      <div className="h-1 gradient-tricolor" />

      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <a href="#home" className="flex items-center gap-2 group">
          <div
            className="rounded-full p-2 bg-white shadow-lg 
                  transition-all duration-300 
                  scale-140"
          >
            <img
              src={logo}
              alt="Civique Arts Logo"
              className="h-16  transition-transform duration-300 scale-125"
            />
          </div>
        </a>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {menuItems.map((item) => (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => item.children && setOpenDropdown(item.label)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              {item.isRoute ? (
                <Link
                  to={item.href}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium tracking-wider text-primary-foreground hover:text-saffron transition-colors"
                >
                  {item.label}
                  {item.children && <ChevronDown className="h-3.5 w-3.5" />}
                </Link>
              ) : (
                <a
                  href={item.href}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium tracking-wider text-primary-foreground hover:text-saffron transition-colors"
                >
                  {item.label}
                  {item.children && <ChevronDown className="h-3.5 w-3.5" />}
                </a>
              )}
              <AnimatePresence>
                {item.children && openDropdown === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 mt-1 min-w-[200px] rounded-lg bg-card shadow-card-hover border border-border overflow-hidden"
                  >
                    {item.children.map((child) =>
                      (child as any).isRoute ? (
                        <Link
                          key={child.label}
                          to={child.href}
                          className="block px-4 py-2.5 text-sm text-foreground hover:bg-secondary hover:text-saffron transition-colors"
                        >
                          {child.label}
                        </Link>
                      ) : (
                        <a
                          key={child.label}
                          href={child.href}
                          className="block px-4 py-2.5 text-sm text-foreground hover:bg-secondary hover:text-saffron transition-colors"
                        >
                          {child.label}
                        </a>
                      )
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 text-primary-foreground"
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="lg:hidden bg-card border-t border-border overflow-hidden"
          >
            {menuItems.map((item) => (
              <div key={item.label}>
                <a
                  href={item.href}
                  onClick={() => !item.children && setMobileOpen(false)}
                  className="flex items-center justify-between px-6 py-3 text-sm font-medium tracking-wider text-foreground hover:bg-secondary"
                >
                  {item.label}
                  {item.children && (
                    <ChevronDown
                      className="h-4 w-4 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        setOpenDropdown(
                          openDropdown === item.label ? null : item.label
                        );
                      }}
                    />
                  )}
                </a>
                {item.children && openDropdown === item.label && (
                  <div className="bg-secondary/50">
                    {item.children.map((child) => (
                      <a
                        key={child.label}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className="block px-10 py-2.5 text-sm text-muted-foreground hover:text-saffron"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
