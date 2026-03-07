import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  PenTool,
  Map,
  Building2,
  Cpu,
  Layers,
  Ruler,
} from "lucide-react";

const services = [
  {
    icon: PenTool,
    title: "Engineering Design",
    desc: "Comprehensive engineering design solutions for civil, structural, and architectural projects.",
  },
  {
    icon: Ruler,
    title: "CAD Drafting",
    desc: "Precise 2D and 3D CAD drafting services with industry-standard tools and practices.",
  },
  {
    icon: Map,
    title: "GIS Mapping",
    desc: "Advanced geospatial analysis and mapping solutions for informed decision-making.",
  },
  {
    icon: Building2,
    title: "BIM Modeling",
    desc: "Building Information Modeling for efficient project planning, design, and management.",
  },
  {
    icon: Cpu,
    title: "MEP Design",
    desc: "Mechanical, Electrical, and Plumbing design for optimal building performance.",
  },
  {
    icon: Layers,
    title: "3D Visualization",
    desc: "Photorealistic renderings and walkthroughs to bring your designs to life.",
  },
];

const ServicesSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="services" className="py-24" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold tracking-widest uppercase text-green-accent">
            What We Offer
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
            Our Services
          </h2>
          <div className="w-20 h-1 gradient-green mx-auto mt-4 rounded-full" />
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 border border-border/50"
            >
              <div className="w-14 h-14 rounded-xl gradient-green flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <service.icon className="h-7 w-7 text-green-accent-foreground" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {service.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {service.desc}
              </p>
              <div className="mt-4 h-0.5 w-0 group-hover:w-full gradient-saffron transition-all duration-500 rounded-full" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
