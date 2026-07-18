import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/Components/website/Navbar';
import Footer from '@/Components/website/Footer';
import CustomCursor from '@/Components/website/CustomCursor';
import RevealSection from '@/Components/website/RevealSection';

const TEAM_HERO_DEFAULT = {
  title: 'Our',
  highlight: 'Team',
  description: 'Meet the architects, designers, urban planners, and project managers driving creative excellence and solid execution.',
};

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState(TEAM_HERO_DEFAULT);

  useEffect(() => {
    fetch('/api/website/public')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.team) {
          setTeamMembers(json.data.team);
        }
        const teamHero = json?.data?.sections?.find((s: any) => s.sectionKey === 'TEAM_HERO');
        if (teamHero) {
          setHero((prev) => ({
            title: teamHero.title || prev.title,
            highlight: teamHero.highlight || prev.highlight,
            description: teamHero.description || prev.description,
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
      <Head title="Meet Our Team" />
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
      </section>

      {/* --- TEAM LIST --- */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          {loading ? (
            <div className="text-center text-slate-500 py-12">Loading team members...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {teamMembers.map((member, i) => (
                <RevealSection
                  key={member.id}
                  delay={i * 100}
                  className="group cursor-expand flex flex-col justify-between p-6 bg-[#1A1816] border border-[#D4AF37]/5 hover:border-[#D4AF37]/20 transition-all duration-500"
                >
                  <div>
                    <div className="relative overflow-hidden aspect-[4/5] mb-8 bg-[#141210] border border-[#D4AF37]/10">
                      <div className="absolute inset-0 bg-[#D4AF37]/5 mix-blend-overlay z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <img
                        src={member.imageUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'}
                        alt={member.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                      />
                    </div>
                    <h4 className="text-2xl font-playfair text-[#FDFBF7] mb-2 group-hover:text-[#D4AF37] transition-colors duration-300">
                      {member.name}
                    </h4>
                    <p className="text-[10px] text-[#D4AF37] tracking-[0.2em] uppercase mb-4">{member.role}</p>
                    {member.bio && (
                      <p className="text-[#A69F95] text-sm font-light leading-relaxed line-clamp-3 mb-6">
                        {member.bio}
                      </p>
                    )}
                  </div>

                  <div className="pt-6 border-t border-[#D4AF37]/10">
                    <Link
                      href={`/team/${member.id}`}
                      className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#FDFBF7] group-hover:text-[#D4AF37] transition-colors inline-flex items-center gap-3"
                    >
                      View Biography
                      <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-2 transition-transform" />
                    </Link>
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
