import { motion, useInView } from "framer-motion";
import { useRef, useState } from "react";
import { ExternalLink } from "lucide-react";

const samples = [
  {
    title: "Highway Bridge Design",
    category: "Engineering Projects",
    desc: "Structural analysis and design for a 200m highway bridge.",
  },
  {
    title: "Smart City GIS Mapping",
    category: "Design Portfolio",
    desc: "Complete GIS mapping for urban smart city planning.",
  },
  {
    title: "Commercial BIM Model",
    category: "Engineering Projects",
    desc: "Full BIM lifecycle management for a commercial complex.",
  },
  {
    title: "Residential MEP Layout",
    category: "Client Case Studies",
    desc: "MEP design for a 500-unit residential township.",
  },
  {
    title: "Industrial CAD Drafting",
    category: "Design Portfolio",
    desc: "Precision CAD drafting for industrial plant layout.",
  },
  {
    title: "Water Treatment Plant",
    category: "Client Case Studies",
    desc: "Engineering design for a municipal water treatment facility.",
  },
];

const colors = [
  "from-saffron/20 to-saffron/5",
  "from-green-accent/20 to-green-accent/5",
  "from-primary/20 to-primary/5",
];

const SamplesSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const [filter, setFilter] = useState("All");
  const categories = ["All", "Engineering Projects", "Design Portfolio", "Client Case Studies"];
  const filtered = filter === "All" ? samples : samples.filter((s) => s.category === filter);

  return (
    <section id="samples" className="py-24 bg-secondary/30" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-sm font-semibold tracking-widest uppercase text-saffron">
            Portfolio
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
            Our Samples
          </h2>
          <div className="w-20 h-1 gradient-saffron mx-auto mt-4 rounded-full" />
        </motion.div>

        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                filter === cat
                  ? "gradient-saffron text-saffron-foreground"
                  : "bg-card text-muted-foreground border border-border hover:border-saffron/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((sample, i) => (
            <motion.div
              key={sample.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`group relative bg-gradient-to-br ${colors[i % 3]} rounded-xl p-6 border border-border/30 hover:shadow-card-hover transition-all duration-300 cursor-pointer overflow-hidden`}
            >
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink className="h-5 w-5 text-saffron" />
              </div>
              <span className="text-xs font-medium text-saffron uppercase tracking-wider">
                {sample.category}
              </span>
              <h3 className="text-lg font-bold text-foreground mt-2 mb-2">
                {sample.title}
              </h3>
              <p className="text-sm text-muted-foreground">{sample.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SamplesSection;
