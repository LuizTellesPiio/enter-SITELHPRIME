import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { About } from "@/components/site/About";
import { Services } from "@/components/site/Services";
import { PortfolioShowcase } from "@/components/site/portfolio/PortfolioShowcase";
import { ColorTools } from "@/components/site/ColorTools";
import { PaintPreview } from "@/components/site/PaintPreview";
import { Discounts } from "@/components/site/Discounts";
import { Process } from "@/components/site/Process";
import { Testimonials } from "@/components/site/Testimonials";
import { ServiceArea } from "@/components/site/ServiceArea";
import { Faq } from "@/components/site/Faq";
import { Contact } from "@/components/site/Contact";
import { Footer } from "@/components/site/Footer";
import { FloatingWhatsApp } from "@/components/site/FloatingWhatsApp";

const Index = () => {
  return (
    <div className="min-h-full w-full">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <PortfolioShowcase />
        <ColorTools />
        <PaintPreview />
        <Discounts />
        <Process />
        <Testimonials />
        <ServiceArea />
        <Faq />
        <Contact />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default Index;
