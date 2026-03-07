import { motion } from "framer-motion";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const HeroSection = () => {
  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 gradient-hero opacity-85" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-saffron/30 bg-saffron/10">
            <span className="text-sm font-medium text-saffron">
              Engineering Excellence Since 2015
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
            Welcome to{" "}
            <span className="text-gradient-tricolor">CiviqueArts</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            Delivering world-class engineering design, CAD drafting, GIS mapping,
            and BIM solutions that transform ideas into reality.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="gradient-saffron text-saffron-foreground font-semibold px-8 py-6 text-base rounded-full hover:opacity-90 transition-opacity"
            >
              <a href="#services">
                Our Services <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 text-primary-foreground font-semibold px-8 py-6 text-base rounded-full hover:bg-primary-foreground/10 transition-colors bg-transparent"
            >
              <a href="#contact">
                <Phone className="mr-2 h-5 w-5" /> Contact Us
              </a>
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;
