import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import DemoSection from "@/components/DemoSection";
import WorkflowSection from "@/components/WorkflowSection";
import StatsSection from "@/components/StatsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <svg className="absolute left-0 top-32 h-72 w-64 opacity-40" viewBox="0 0 240 300" aria-hidden="true">
          <path
            d="M 8 40 H 120 L 140 20 H 210"
            fill="none"
            stroke="hsl(0 78% 55% / 0.4)"
            strokeWidth="2"
          />
          <path
            d="M 8 110 H 80 L 100 90 H 160 L 190 120 H 230"
            fill="none"
            stroke="hsl(0 78% 55% / 0.35)"
            strokeWidth="2"
          />
          <path
            d="M 8 200 H 90 L 120 170 H 200"
            fill="none"
            stroke="hsl(0 78% 55% / 0.3)"
            strokeWidth="2"
          />
          <circle cx="120" cy="40" r="3" fill="hsl(0 78% 55% / 0.55)" />
          <circle cx="100" cy="90" r="3" fill="hsl(0 78% 55% / 0.55)" />
          <circle cx="120" cy="170" r="3" fill="hsl(0 78% 55% / 0.55)" />
        </svg>
        <svg className="absolute right-0 top-48 h-80 w-72 opacity-35" viewBox="0 0 260 320" aria-hidden="true">
          <path
            d="M 250 60 H 140 L 120 40 H 40"
            fill="none"
            stroke="hsl(0 78% 55% / 0.4)"
            strokeWidth="2"
          />
          <path
            d="M 250 140 H 180 L 150 110 H 80 L 50 140 H 10"
            fill="none"
            stroke="hsl(0 78% 55% / 0.32)"
            strokeWidth="2"
          />
          <path
            d="M 250 230 H 160 L 130 200 H 60"
            fill="none"
            stroke="hsl(0 78% 55% / 0.28)"
            strokeWidth="2"
          />
          <circle cx="140" cy="60" r="3" fill="hsl(0 78% 55% / 0.55)" />
          <circle cx="150" cy="110" r="3" fill="hsl(0 78% 55% / 0.55)" />
          <circle cx="130" cy="200" r="3" fill="hsl(0 78% 55% / 0.55)" />
        </svg>
      </div>
      <Navbar />
      <HeroSection />
      <AboutSection />
      <DemoSection />
      <WorkflowSection />
      <StatsSection />
      <Footer />
    </div>
  );
};

export default Index;
