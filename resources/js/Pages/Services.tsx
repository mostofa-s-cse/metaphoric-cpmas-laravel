import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/Components/website/Navbar';
import Footer from '@/Components/website/Footer';
import CustomCursor from '@/Components/website/CustomCursor';
import RevealSection from '@/Components/website/RevealSection';

const SERVICES_HERO_DEFAULT = {
  title: 'Our',
  highlight: 'Expertise',
  description: 'From initial planning and architectural conceptualization to interior detailing and construction management, we craft spaces that blend timeless form with purposeful function.',
};

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState(SERVICES_HERO_DEFAULT);

  useEffect(() => {
    fetch('/api/website/public')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.services) {
          setServices(json.data.services);
        }
        const servicesHero = json?.data?.sections?.find((s: any) => s.sectionKey === 'SERVICES_HERO');
        if (servicesHero) {
          setHero((prev) => ({
            title: servicesHero.title || prev.title,
            highlight: servicesHero.highlight || prev.highlight,
            description: servicesHero.description || prev.description,
          }));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-[#141210] text-[#E8E3DB] font-sans selection:bg-[#D4AF37]/30 selection:text-[#FDFBF7] overflow-x-hidden font-inter">
      <Head title="Our Services & Expertise" />
      <CustomCursor />
      <Navbar />

      {/* --- HERO BANNER --- */}
      <section className="relative pt-40 pb-20 border-b border-[#D4AF37]/10 bg-[#1A1816]">
        <RevealSection className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-playfair font-normal leading-tight text-[#FDFBF7] mb-6">
              {hero.title} <i className="text-[#D4AF37]">{hero.highlight}</i>.
            </h1>
            <p className="text-[#A69F95] text-lg leading-relaxed font-light">
              {hero.description}
            </p>
          </div>
        </RevealSection>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/5 to-transparent pointer-events-none" />
      </section>

      {/* --- SERVICES GRID --- */}
      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          {loading ? (
            <div className="text-center text-slate-500 py-12">Loading services...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service, index) => (
                <RevealSection
                  key={service.id}
                  delay={index * 100}
                  className="group relative overflow-hidden bg-[#1A1816] border border-[#D4AF37]/10 hover:border-[#D4AF37]/40 transition-all duration-500 flex flex-col justify-between h-[500px]"
                >
                  <div className="relative h-64 w-full overflow-hidden">
                    <div className="absolute inset-0 bg-[#D4AF37]/10 mix-blend-overlay z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <img
                      src={service.imageUrl || 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80'}
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                    />
                    <div className="absolute top-6 left-6 z-20 bg-[#141210]/80 backdrop-blur-md border border-[#D4AF37]/20 px-4 py-2 text-[10px] font-medium tracking-[0.2em] uppercase text-[#D4AF37]">
                      0{index + 1}
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-2xl font-playfair text-[#FDFBF7] mb-4 group-hover:text-[#D4AF37] transition-colors duration-500">
                        {service.title}
                      </h3>
                      <p className="text-[#A69F95] text-sm font-light leading-relaxed line-clamp-3 break-words">
                        {service.description && service.description.length > 150 
                          ? service.description.slice(0, 150) + '...' 
                          : service.description}
                      </p>
                    </div>

                    <div className="pt-6 border-t border-[#D4AF37]/10 flex justify-between items-center">
                      <Link
                        href={`/services/${service.id}`}
                        className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#FDFBF7] group-hover:text-[#D4AF37] transition-colors flex items-center gap-3"
                      >
                        Explore Service
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-2 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </RevealSection>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
      `}} />
    </div>
  );
}
