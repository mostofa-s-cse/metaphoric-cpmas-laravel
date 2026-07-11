import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Navbar from '@/Components/website/Navbar';
import Footer from '@/Components/website/Footer';
import CustomCursor from '@/Components/website/CustomCursor';
import RevealSection from '@/Components/website/RevealSection';

interface Props {
  id: string;
}

export default function TeamDetailPage({ id }: Props) {
  const [member, setMember] = useState<any>(null);
  const [otherTeam, setOtherTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/website/public')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.team) {
          const list = json.data.team;
          const found = list.find((m: any) => m.id === id);
          if (found) {
            setMember(found);
            setOtherTeam(list.filter((m: any) => m.id !== id).slice(0, 3));
          }
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
        <p className="text-slate-500">Loading biography details...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[#141210] text-[#E8E3DB] flex flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-playfair">Member Not Found</h1>
        <Link href="/team" className="text-xs text-[#D4AF37] uppercase tracking-wider underline">
          Back to Team
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141210] text-[#E8E3DB] font-sans selection:bg-[#D4AF37]/30 selection:text-[#FDFBF7] overflow-x-hidden font-inter">
      <Head title={member.name} />
      <CustomCursor />
      <Navbar />

      {/* --- HERO BANNER --- */}
      <section className="relative pt-48 pb-20 border-b border-[#D4AF37]/10 bg-[#1A1816]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <Link 
            href="/team" 
            className="inline-flex items-center gap-3 text-[10px] font-medium tracking-[0.2em] uppercase text-[#D4AF37] hover:text-[#E8E3DB] transition-colors group mb-8 w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1.5 transition-transform" />
            Back to Team
          </Link>
          <div>
            <span className="text-[10px] font-medium tracking-[0.4em] text-[#D4AF37] uppercase mb-4 block">
              {member.role}
            </span>
            <h1 className="text-4xl md:text-6xl font-playfair font-normal leading-tight text-[#FDFBF7]">
              {member.name}
            </h1>
          </div>
        </div>
      </section>

      {/* --- DETAILS SECTION --- */}
      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            
            {/* Left Portrait Column */}
            <div className="lg:col-span-5">
              <RevealSection>
                <div className="relative aspect-[4/5] w-full overflow-hidden border border-[#D4AF37]/20 shadow-2xl bg-[#1A1816]">
                  <img 
                    src={member.imageUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'} 
                    alt={member.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </RevealSection>
            </div>

            {/* Right Details Column */}
            <div className="lg:col-span-7 space-y-12">
              <RevealSection delay={200} className="space-y-6">
                <h2 className="text-2xl font-playfair text-[#FDFBF7] flex items-center gap-4">
                  <span className="w-8 h-[1px] bg-[#D4AF37]"></span> Professional Biography
                </h2>
                {member.bio ? (
                  member.bio.split('\n').filter((p: string) => p.trim()).map((paragraph: string, index: number) => (
                    <p key={index} className="text-[#A69F95] text-base leading-loose font-light">
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p className="text-[#A69F95] text-base leading-loose font-light italic">
                    Biography is being compiled. Check back soon for more details on {member.name}'s work and expertise.
                  </p>
                )}
              </RevealSection>

              {/* Design quote or philosophy */}
              <RevealSection delay={300} className="border-t border-b border-[#D4AF37]/10 py-10 font-playfair italic text-lg md:text-xl text-[#FDFBF7] leading-relaxed">
                "Architecture is a metaphor for human connection. We do not just build concrete structures; we model spaces that foster community and inspire dreams."
              </RevealSection>

              {/* Browse other team members */}
              {otherTeam.length > 0 && (
                <RevealSection delay={400} className="space-y-8 pt-6">
                  <h3 className="text-sm font-medium tracking-[0.2em] text-[#8C8477] uppercase">
                    Other Partners & Team Members
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    {otherTeam.map((other) => (
                      <Link key={other.id} href={`/team/${other.id}`} className="group block">
                        <div className="aspect-[4/5] overflow-hidden mb-4 bg-[#1A1816] border border-[#D4AF37]/5 group-hover:border-[#D4AF37]/25 transition-all">
                          <img 
                            src={other.imageUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'} 
                            alt={other.name} 
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                          />
                        </div>
                        <h4 className="text-sm font-medium text-[#E8E3DB] group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                          {other.name}
                        </h4>
                        <p className="text-[10px] text-[#8C8477] uppercase tracking-wider mt-1 line-clamp-1">
                          {other.role}
                        </p>
                      </Link>
                    ))}
                  </div>
                </RevealSection>
              )}
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
