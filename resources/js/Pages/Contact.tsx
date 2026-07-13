import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import Navbar from '@/Components/website/Navbar';
import Footer from '@/Components/website/Footer';
import CustomCursor from '@/Components/website/CustomCursor';
import RevealSection from '@/Components/website/RevealSection';

const BRAND = {
  city: 'Dhaka, Bangladesh',
  email: 'info@metaphoricarchitect.com',
  phone: '+880 1XXX-XXXXXX',
  address: 'Dhaka, Bangladesh',
};

export default function ContactPage() {
  const [brand, setBrand] = useState(BRAND);
  const [services, setServices] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/website/public')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.settings?.BRAND_INFO) {
          setBrand((prev) => ({ ...prev, ...json.data.settings.BRAND_INFO }));
        }
        if (json?.data?.services) {
          setServices(json.data.services);
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      scope: (form.elements.namedItem('scope') as HTMLSelectElement).value,
      details: (form.elements.namedItem('details') as HTMLTextAreaElement).value,
    };

    setStatus('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        form.reset();
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    } finally {
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#141210] text-[#E8E3DB] font-sans selection:bg-[#D4AF37]/30 selection:text-[#FDFBF7] overflow-x-hidden font-inter">
      <Head title="Contact Us" />
      <CustomCursor />
      <Navbar />

      {/* --- HERO BANNER --- */}
      <section className="relative pt-48 pb-24 border-b border-[#D4AF37]/10 bg-[#1A1816]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-playfair font-normal leading-tight text-[#FDFBF7] mb-6">
              Let's talk <i className="text-[#D4AF37]">design</i>.
            </h1>
            <p className="text-[#A69F95] text-lg leading-relaxed font-light">
              Reach out to discuss your residential, commercial, or urban project in {brand.city} and across Bangladesh.
            </p>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-[#D4AF37]/5 to-transparent pointer-events-none" />
      </section>

      {/* --- CONTACT DETAILS + FORM --- */}
      <section className="py-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 flex flex-col lg:flex-row gap-20">
          <RevealSection className="lg:w-2/5 space-y-10">
            <div>
              <h5 className="text-[9px] font-medium tracking-[0.3em] text-[#8C8477] uppercase mb-3">Email</h5>
              <a
                href={`mailto:${brand.email}`}
                className="text-xl font-playfair italic text-[#E8E3DB] hover:text-[#D4AF37] transition-colors cursor-expand"
              >
                {brand.email}
              </a>
            </div>
            {brand.phone && (
              <div>
                <h5 className="text-[9px] font-medium tracking-[0.3em] text-[#8C8477] uppercase mb-3">Phone</h5>
                <a
                  href={`tel:${brand.phone}`}
                  className="text-xl font-playfair italic text-[#E8E3DB] hover:text-[#D4AF37] transition-colors cursor-expand"
                >
                  {brand.phone}
                </a>
              </div>
            )}
            <div>
              <h5 className="text-[9px] font-medium tracking-[0.3em] text-[#8C8477] uppercase mb-3">Location</h5>
              <p className="text-lg font-light text-[#E8E3DB] leading-relaxed">{brand.address}</p>
            </div>
          </RevealSection>

          <RevealSection delay={150} className="lg:w-3/5 bg-[#1A1816] border border-[#D4AF37]/20 p-10 md:p-14">
            <h3 className="text-2xl font-playfair text-[#FDFBF7] mb-10">Begin a dialogue</h3>
            <form className="space-y-10" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <label className="block text-[9px] font-medium tracking-[0.3em] text-[#8C8477] uppercase mb-3">
                    Name
                  </label>
                  <input
                    name="name"
                    required
                    type="text"
                    className="w-full bg-transparent border-b border-[#D4AF37]/20 pb-4 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] transition-colors placeholder:text-[#3A3530] font-light text-sm"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-medium tracking-[0.3em] text-[#8C8477] uppercase mb-3">
                    Email
                  </label>
                  <input
                    name="email"
                    required
                    type="email"
                    className="w-full bg-transparent border-b border-[#D4AF37]/20 pb-4 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] transition-colors placeholder:text-[#3A3530] font-light text-sm"
                    placeholder="jane@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-medium tracking-[0.3em] text-[#8C8477] uppercase mb-3">
                  Project Scope
                </label>
                <select
                  name="scope"
                  required
                  className="w-full bg-transparent border-b border-[#D4AF37]/20 pb-4 text-[#E8E3DB] focus:outline-none focus:border-[#D4AF37] transition-colors font-light text-sm appearance-none cursor-pointer"
                >
                  {services.map((svc: any) => (
                    <option key={svc.id} value={svc.title} className="bg-[#1A1816] text-[#E8E3DB]">
                      {svc.title}
                    </option>
                  ))}
                  {services.length === 0 && (
                    <>
                      <option className="bg-[#1A1816]">Architecture & Planning</option>
                      <option className="bg-[#1A1816]">Interior Design</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-medium tracking-[0.3em] text-[#8C8477] uppercase mb-3">
                  Details
                </label>
                <textarea
                  name="details"
                  rows={4}
                  className="w-full bg-transparent border-b border-[#D4AF37]/20 pb-4 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] transition-colors placeholder:text-[#3A3530] font-light text-sm resize-none"
                  placeholder="Share your vision with us..."
                ></textarea>
              </div>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full py-5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#141210] font-medium tracking-[0.3em] uppercase text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'submitting' && 'Submitting...'}
                {status === 'success' && 'Sent Successfully'}
                {status === 'error' && 'Error! Try Again'}
                {status === 'idle' && 'Submit Inquiry'}
              </button>
            </form>
          </RevealSection>
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
