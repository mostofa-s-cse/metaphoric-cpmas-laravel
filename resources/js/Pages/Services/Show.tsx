import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import Navbar from '@/Components/website/Navbar';
import Footer from '@/Components/website/Footer';
import CustomCursor from '@/Components/website/CustomCursor';
import RevealSection from '@/Components/website/RevealSection';

interface Props {
  id: string;
}

const APPROACH_DEFAULT = {
  title: 'Our Approach',
  items: [
    { title: 'Rigorous Detailing', description: 'Every line drawn serves a functional and aesthetic purpose, detailed to absolute perfection.' },
    { title: 'Local Expertise', description: 'Deep understanding of Dhaka\'s urban requirements, building codes, and material suppliers.' },
    { title: 'Sustainable Vision', description: 'Crafting spaces that optimize light, ventilation, and minimize environmental impact.' },
    { title: 'End-to-End Delivery', description: 'Bridging the gap between creative design blueprint and practical field execution.' },
  ],
};

const SHOW_CTA_DEFAULT = {
  title: 'Start Your Project',
  description: "Let's sit down and discuss how we can transform your space. Get a tailored consult for this service.",
};

export default function ServiceDetailPage({ id }: Props) {
  const [service, setService] = useState<any>(null);
  const [otherServices, setOtherServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approach, setApproach] = useState(APPROACH_DEFAULT);
  const [cta, setCta] = useState(SHOW_CTA_DEFAULT);

  useEffect(() => {
    fetch('/api/website/public')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.services) {
          const list = json.data.services;
          const found = list.find((s: any) => s.id === id);
          if (found) {
            setService(found);
            setOtherServices(list.filter((s: any) => s.id !== id).slice(0, 4));
          }
        }
        const approachSection = json?.data?.sections?.find((s: any) => s.sectionKey === 'SERVICES_APPROACH');
        if (approachSection) {
          setApproach((prev) => ({
            title: approachSection.title || prev.title,
            items: approachSection.extraData?.items?.length ? approachSection.extraData.items : prev.items,
          }));
        }
        const ctaSection = json?.data?.sections?.find((s: any) => s.sectionKey === 'SERVICES_SHOW_CTA');
        if (ctaSection) {
          setCta((prev) => ({
            title: ctaSection.title || prev.title,
            description: ctaSection.description || prev.description,
          }));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141210] text-[#E8E3DB] flex items-center justify-center">
        <p className="text-slate-500">Loading service details...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-[#141210] text-[#E8E3DB] flex flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-playfair">Service Not Found</h1>
        <Link href="/services" className="text-xs text-[#D4AF37] uppercase tracking-wider underline">
          Back to Services
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141210] text-[#E8E3DB] font-sans selection:bg-[#D4AF37]/30 selection:text-[#FDFBF7] overflow-x-hidden font-inter">
      <Head title={service.title} />
      <CustomCursor />
      <Navbar />

      {/* --- HERO BANNER --- */}
      <section className="relative pt-40 pb-20 border-b border-[#D4AF37]/10 bg-[#1A1816] overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-10 pointer-events-none">
          <img
            src={service.imageUrl || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80'}
            alt={service.title}
            className="w-full h-full object-cover filter blur-sm scale-110"
          />
        </div>

        <RevealSection className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <div className="flex flex-col gap-6">
            <Link
              href="/services"
              className="inline-flex items-center gap-3 text-[10px] font-medium tracking-[0.2em] uppercase text-[#D4AF37] hover:text-[#E8E3DB] transition-colors group mb-4 w-fit"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1.5 transition-transform" />
              Back to Services
            </Link>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-playfair font-normal leading-tight text-[#FDFBF7] max-w-4xl">
              {service.title}
            </h1>
          </div>
        </RevealSection>
      </section>

      {/* --- CONTENT SECTION --- */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            
            {/* Left/Main Column - Service Details */}
            <div className="lg:col-span-2 space-y-12">
              <RevealSection>
                <div className="relative aspect-[16/9] w-full overflow-hidden border border-[#D4AF37]/20 shadow-2xl">
                  <img 
                    src={service.imageUrl || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80'} 
                    alt={service.title} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </RevealSection>

              <RevealSection delay={200} className="prose prose-invert max-w-none">
                <h2 className="text-2xl font-playfair text-[#FDFBF7] mb-6 flex items-center gap-4">
                  <span className="w-8 h-[1px] bg-[#D4AF37]"></span> Overview & Scope
                </h2>
                {service.description.split('\n').filter((p: string) => p.trim()).map((paragraph: string, index: number) => (
                  <p key={index} className="text-[#A69F95] text-base leading-loose font-light mb-6 break-words">
                    {paragraph}
                  </p>
                ))}
              </RevealSection>

              {/* Unique Features / Methodology */}
              <RevealSection delay={300} className="border-t border-[#D4AF37]/10 pt-12">
                <h3 className="text-xl font-playfair text-[#FDFBF7] mb-8">{approach.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {approach.items.map((item: any, i: number) => (
                    <div key={i} className="flex gap-4 p-6 bg-[#1A1816] border border-[#D4AF37]/5 hover:border-[#D4AF37]/20 transition-all duration-300">
                      <CheckCircle2 className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-[#FDFBF7] mb-2">{item.title}</h4>
                        <p className="text-xs text-[#A69F95] leading-relaxed font-light">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </RevealSection>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-12">
              {/* Other Services list */}
              <RevealSection className="bg-[#1A1816] border border-[#D4AF37]/10 p-8">
                <h3 className="text-lg font-playfair text-[#FDFBF7] mb-6 pb-4 border-b border-[#D4AF37]/10">
                  Other Services
                </h3>
                <div className="space-y-6">
                  {otherServices.map((other) => (
                    <Link 
                      key={other.id} 
                      href={`/services/${other.id}`}
                      className="group block"
                    >
                      <h4 className="text-sm font-medium text-[#E8E3DB] group-hover:text-[#D4AF37] transition-colors mb-1 line-clamp-1">
                        {other.title}
                      </h4>
                      <p className="text-xs text-[#8C8477] line-clamp-2 font-light leading-relaxed">
                        {other.description}
                      </p>
                      <span className="inline-flex items-center gap-2 text-[9px] font-medium tracking-wider uppercase text-[#D4AF37] mt-3 group-hover:text-[#FDFBF7] transition-colors">
                        View Details <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </Link>
                  ))}
                </div>
              </RevealSection>

              {/* Inquiry Sidebar CTA */}
              <RevealSection delay={200} className="bg-[#1A1816] border border-[#D4AF37]/15 p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#D4AF37]/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 pointer-events-none"></div>
                <h3 className="text-xl font-playfair text-[#FDFBF7] mb-4">
                  {cta.title}
                </h3>
                <p className="text-xs text-[#A69F95] leading-relaxed mb-8 font-light">
                  {cta.description}
                </p>
                <a 
                  href="#contact" 
                  className="w-full text-center py-4 bg-[#D4AF37] hover:bg-[#E5C158] text-[#141210] font-medium tracking-[0.2em] uppercase text-[10px] transition-all block"
                >
                  Inquire Now
                </a>
              </RevealSection>
            </div>

          </div>
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
