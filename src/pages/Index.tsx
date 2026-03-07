import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ServicesSection from "@/components/ServicesSection";
import SamplesSection from "@/components/SamplesSection";
import StatsSection from "@/components/StatsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import AppSidebar from "@/components/AppSidebar";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <AppSidebar />
      <main>
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <SamplesSection />
        <StatsSection />
        <TestimonialsSection />
        <ContactSection />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default Index;
