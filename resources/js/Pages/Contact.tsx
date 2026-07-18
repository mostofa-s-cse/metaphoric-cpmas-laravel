import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import Navbar from '@/Components/website/Navbar';
import Footer from '@/Components/website/Footer';
import CustomCursor from '@/Components/website/CustomCursor';
import RevealSection from '@/Components/website/RevealSection';

const BRAND = {
  city: 'Dhaka, Bangladesh',
};

const CONTACT_HERO_DEFAULT = {
  title: "Let's talk",
  highlight: 'design',
  description: 'Reach out to discuss your residential, commercial, or urban project in {city} and across Bangladesh.',
};

export default function ContactPage() {
  const [brand, setBrand] = useState(BRAND);
  const [hero, setHero] = useState(CONTACT_HERO_DEFAULT);

  useEffect(() => {
    fetch('/api/website/public')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.settings?.BRAND_INFO) {
          setBrand((prev) => ({ ...prev, ...json.data.settings.BRAND_INFO }));
        }
        const contactHero = json?.data?.sections?.find((s: any) => s.sectionKey === 'CONTACT_HERO');
        if (contactHero) {
          setHero((prev) => ({
            title: contactHero.title || prev.title,
            highlight: contactHero.highlight || prev.highlight,
            description: contactHero.description || prev.description,
          }));
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-[#141210] text-[#E8E3DB] font-sans selection:bg-[#D4AF37]/30 selection:text-[#FDFBF7] overflow-x-hidden font-inter">
      <Head title="Contact Us" />
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
              {hero.description.replace('{city}', brand.city)}
            </p>
          </div>
        </RevealSection>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/5 to-transparent pointer-events-none" />
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
