import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { Calendar, CheckCircle, Users, Trophy } from "lucide-react";

const stats = [
  { icon: Calendar, value: 10, suffix: "+", label: "Years Experience" },
  { icon: CheckCircle, value: 500, suffix: "+", label: "Projects Completed" },
  { icon: Users, value: 200, suffix: "+", label: "Happy Clients" },
  { icon: Trophy, value: 25, suffix: "+", label: "Awards Won" },
];

const Counter = ({ target, inView }: { target: number; inView: boolean }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span>{count}</span>;
};

const StatsSection = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 gradient-hero" ref={ref}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full gradient-saffron flex items-center justify-center mx-auto mb-4">
                <stat.icon className="h-8 w-8 text-saffron-foreground" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground mb-1">
                <Counter target={stat.value} inView={inView} />
                {stat.suffix}
              </div>
              <p className="text-sm text-primary-foreground/70">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
