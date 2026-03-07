import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Target, Eye, Award } from "lucide-react";

const AboutSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" className="py-24 bg-secondary/30" ref={ref}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold tracking-widest uppercase text-saffron">
            About Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
            About CiviqueArts
          </h2>
          <div className="w-20 h-1 gradient-saffron mx-auto mt-4 rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-2xl font-bold text-foreground mb-4">
              Pioneering Engineering Solutions
            </h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              CiviqueArts is a leading engineering design and consulting firm
              specializing in CAD drafting, GIS mapping, BIM modeling, and MEP
              design. With a commitment to precision and innovation, we deliver
              solutions that exceed expectations.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Founded with the vision to bridge traditional engineering with
              modern technology, we have grown into a trusted partner for
              businesses worldwide, delivering projects that stand the test of
              time.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {[
              {
                icon: Target,
                title: "Our Mission",
                desc: "To deliver innovative engineering solutions with precision, quality, and on-time delivery.",
              },
              {
                icon: Eye,
                title: "Our Vision",
                desc: "To be the global leader in engineering design and technology-driven solutions.",
              },
              {
                icon: Award,
                title: "Quality First",
                desc: "ISO-certified processes ensuring the highest standards in every project.",
              },
              {
                icon: Award,
                title: "Innovation",
                desc: "Leveraging cutting-edge tools and methodologies for superior results.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-card rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300"
              >
                <div className="w-10 h-10 rounded-lg gradient-saffron flex items-center justify-center mb-3">
                  <item.icon className="h-5 w-5 text-saffron-foreground" />
                </div>
                <h4 className="font-semibold text-foreground mb-1">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
