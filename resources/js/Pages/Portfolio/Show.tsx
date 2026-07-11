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

export default function ProjectDetailPage({ id }: Props) {
  const [project, setProject] = useState<any>(null);
  const [otherProjects, setOtherProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/website/public')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.portfolio) {
          const list = json.data.portfolio;
          const found = list.find((p: any) => p.id === id);
          if (found) {
            setProject(found);
            setOtherProjects(list.filter((p: any) => p.id !== id).slice(0, 2));
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
        <p className="text-slate-500">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#141210] text-[#E8E3DB] flex flex-col items-center justify-center gap-6">
        <h1 className="text-2xl font-playfair">Project Not Found</h1>
        <Link href="/portfolio" className="text-xs text-[#D4AF37] uppercase tracking-wider underline">
          Back to Portfolio
        </Link>
      </div>
    );
  }

  // Parse metrics
  const metrics = project.projectMetrics ? (project.projectMetrics as Record<string, any>) : {};

  return (
    <div className="min-h-screen bg-[#141210] text-[#E8E3DB] font-sans selection:bg-[#D4AF37]/30 selection:text-[#FDFBF7] overflow-x-hidden font-inter">
      <Head title={project.title} />
      <CustomCursor />
      <Navbar />

      {/* --- HERO BANNER --- */}
      <section className="relative pt-48 pb-20 border-b border-[#D4AF37]/10 bg-[#1A1816]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <Link 
            href="/portfolio" 
            className="inline-flex items-center gap-3 text-[10px] font-medium tracking-[0.2em] uppercase text-[#D4AF37] hover:text-[#E8E3DB] transition-colors group mb-8 w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1.5 transition-transform" />
            Back to Portfolio
          </Link>
          <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-8">
            <div>
              <span className="text-[10px] font-medium tracking-[0.4em] text-[#D4AF37] uppercase mb-4 block">
                {project.category}
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-playfair font-normal leading-tight text-[#FDFBF7] max-w-4xl">
                {project.title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* --- PROJECT HERO IMAGE --- */}
      <section className="relative aspect-[16/7] w-full overflow-hidden border-b border-[#D4AF37]/10">
        <img 
          src={project.coverImage} 
          alt={project.title} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-transparent to-transparent opacity-60"></div>
      </section>

      {/* --- DETAILS SECTION --- */}
      <section className="py-24">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            
            {/* Left/Main Content Column */}
            <div className="lg:col-span-2 space-y-16">
              
              {/* Challenge & Solution */}
              {project.theChallenge && (
                <RevealSection className="space-y-6">
                  <h2 className="text-2xl font-playfair text-[#FDFBF7] flex items-center gap-4">
                    <span className="w-8 h-[1px] bg-[#D4AF37]"></span> The Challenge
                  </h2>
                  <p className="text-[#A69F95] text-base leading-loose font-light break-words">
                    {project.theChallenge}
                  </p>
                </RevealSection>
              )}

              {project.theSolution && (
                <RevealSection delay={100} className="space-y-6">
                  <h2 className="text-2xl font-playfair text-[#FDFBF7] flex items-center gap-4">
                    <span className="w-8 h-[1px] bg-[#D4AF37]"></span> The Solution
                  </h2>
                  <p className="text-[#A69F95] text-base leading-loose font-light break-words">
                    {project.theSolution}
                  </p>
                </RevealSection>
              )}

              {project.theOutcome && (
                <RevealSection delay={200} className="space-y-6">
                  <h2 className="text-2xl font-playfair text-[#FDFBF7] flex items-center gap-4">
                    <span className="w-8 h-[1px] bg-[#D4AF37]"></span> The Outcome
                  </h2>
                  <p className="text-[#A69F95] text-base leading-loose font-light break-words">
                    {project.theOutcome}
                  </p>
                </RevealSection>
              )}

              {/* Before & After Comparison */}
              {(project.beforeImage || project.afterImage) && (
                <RevealSection delay={300} className="border-t border-[#D4AF37]/10 pt-16 space-y-8">
                  <h3 className="text-2xl font-playfair text-[#FDFBF7]">Before & After Transformation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {project.beforeImage && (
                      <div className="space-y-4">
                        <div className="relative aspect-[4/3] overflow-hidden border border-[#D4AF37]/10">
                          <img 
                            src={project.beforeImage} 
                            alt="Before" 
                            className="w-full h-full object-cover grayscale-[40%]" 
                          />
                          <div className="absolute top-4 left-4 bg-[#141210]/80 backdrop-blur-md px-3 py-1 text-[9px] tracking-widest text-[#8C8477] uppercase border border-[#D4AF37]/10">
                            Before
                          </div>
                        </div>
                      </div>
                    )}

                    {project.afterImage && (
                      <div className="space-y-4">
                        <div className="relative aspect-[4/3] overflow-hidden border border-[#D4AF37]/20">
                          <img 
                            src={project.afterImage} 
                            alt="After" 
                            className="w-full h-full object-cover" 
                          />
                          <div className="absolute top-4 left-4 bg-[#D4AF37]/90 px-3 py-1 text-[9px] tracking-widest text-[#141210] uppercase font-bold">
                            After
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </RevealSection>
              )}

              {/* Gallery */}
              {Array.isArray(project.images) && project.images.length > 0 && (
                <RevealSection delay={350} className="border-t border-[#D4AF37]/10 pt-16 space-y-8">
                  <h3 className="text-2xl font-playfair text-[#FDFBF7]">Gallery</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {project.images.map((img: string, idx: number) => (
                      <div key={idx} className="relative aspect-square overflow-hidden border border-[#D4AF37]/10">
                        <img
                          src={img}
                          alt={`${project.title} gallery ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ))}
                  </div>
                </RevealSection>
              )}
            </div>

            {/* Right Sidebar Column */}
            <div className="space-y-12">
              
              {/* Project Metrics */}
              {Object.keys(metrics).length > 0 && (
                <RevealSection className="bg-[#1A1816] border border-[#D4AF37]/10 p-8 space-y-6">
                  <h3 className="text-lg font-playfair text-[#FDFBF7] pb-4 border-b border-[#D4AF37]/10">
                    Project Details
                  </h3>
                  <div className="space-y-6">
                    {Object.entries(metrics).map(([key, val]) => (
                      <div key={key}>
                        <h4 className="text-[9px] font-medium tracking-[0.2em] text-[#8C8477] uppercase mb-1">
                          {key}
                        </h4>
                        <p className="text-sm text-[#E8E3DB] font-light leading-relaxed">
                          {String(val)}
                        </p>
                      </div>
                    ))}
                  </div>
                </RevealSection>
              )}

              {/* Sidebar CTA */}
              <RevealSection delay={200} className="bg-[#1A1816] border border-[#D4AF37]/15 p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[#D4AF37]/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-700 pointer-events-none"></div>
                <h3 className="text-xl font-playfair text-[#FDFBF7] mb-4">
                  Request Similar Concept
                </h3>
                <p className="text-xs text-[#A69F95] leading-relaxed mb-8 font-light">
                  Inspired by this design? Begin a dialogue with us to discuss architectural planning for your specific space.
                </p>
                <a 
                  href="#contact" 
                  className="w-full text-center py-4 bg-[#D4AF37] hover:bg-[#E5C158] text-[#141210] font-medium tracking-[0.2em] uppercase text-[10px] transition-all block"
                >
                  Start Dialogue
                </a>
              </RevealSection>

              {/* Next Projects Link */}
              {otherProjects.length > 0 && (
                <RevealSection delay={300} className="bg-[#1A1816] border border-[#D4AF37]/10 p-8 space-y-6">
                  <h3 className="text-sm font-playfair text-[#FDFBF7] pb-4 border-b border-[#D4AF37]/10">
                    Explore More Work
                  </h3>
                  <div className="space-y-6">
                    {otherProjects.map((other) => (
                      <Link key={other.id} href={`/portfolio/${other.id}`} className="group block">
                        <div className="aspect-[16/10] w-full overflow-hidden mb-3 border border-[#D4AF37]/5 group-hover:border-[#D4AF37]/20 transition-all">
                          <img src={other.coverImage} alt={other.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                        </div>
                        <h4 className="text-sm font-medium text-[#E8E3DB] group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                          {other.title}
                        </h4>
                        <span className="text-[9px] text-[#8C8477] uppercase tracking-wider block mt-1">
                          {other.category}
                        </span>
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
