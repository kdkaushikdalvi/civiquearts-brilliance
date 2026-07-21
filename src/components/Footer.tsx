import logo from "@/assets/logo.png";
import { Facebook, Twitter, Linkedin, Instagram, Youtube } from "lucide-react";

const Footer = () => {
  return (
    <footer className="gradient-hero text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <img
              src={logo}
              alt="Civique Arts"
              className="h-20 w-auto mb-4"
            />
            <p className="text-sm text-primary-foreground/70 leading-relaxed">
              Delivering innovative engineering design, CAD drafting, and BIM
              solutions to clients worldwide.
            </p>
            <div className="flex gap-3 mt-5">
              {[Facebook, Twitter, Linkedin, Instagram, Youtube].map(
                (Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-saffron transition-colors"
                    aria-label="Social"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ),
              )}
            </div>
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            {[
              "Home",
              "About Us",
              "Services",
              "Our Samples",
              "Career",
              "Contact",
            ].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase().replace(/\s/g, "")}`}
                className="block text-sm text-primary-foreground/70 hover:text-saffron transition-colors mb-2"
              >
                {link}
              </a>
            ))}
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Services</h4>
            {[
              "Engineering Design",
              "CAD Drafting",
              "GIS Mapping",
              "BIM Modeling",
              "MEP Design",
            ].map((s) => (
              <a
                key={s}
                href="#services"
                className="block text-sm text-primary-foreground/70 hover:text-saffron transition-colors mb-2"
              >
                {s}
              </a>
            ))}
          </div>

          <div>
            <h4 className="font-bold text-lg mb-4">Contact Info</h4>
            <p className="text-sm text-primary-foreground/70 mb-1 font-medium">
              Vijay Chaudhari
            </p>
            <p className="text-sm text-primary-foreground/70 mb-2">
              Uruli Kanchan, Maharashtra, India
            </p>
            <p className="text-sm text-primary-foreground/70 mb-2">
              +91 9011718351
            </p>
            <p className="text-sm text-primary-foreground/70">
              info@civiquearts.com
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-primary-foreground/10 py-4">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-primary-foreground/50">
            © {new Date().getFullYear()} Civique Arts. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
