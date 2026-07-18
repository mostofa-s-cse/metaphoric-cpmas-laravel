import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, MapPin } from 'lucide-react';
import Navbar from '@/Components/website/Navbar';
import Footer from '@/Components/website/Footer';
import CustomCursor from '@/Components/website/CustomCursor';
import RevealSection from '@/Components/website/RevealSection';

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  location: string | null;
  coverImage: string;
  order: number;
  theChallenge: string | null;
}

const PORTFOLIO_HERO_DEFAULT = {
  title: 'Our',
  highlight: 'Portfolio',
  description: 'Explore our curation of premium residential, commercial, and structural designs crafted across Dhaka and greater Bangladesh.',
};

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState(PORTFOLIO_HERO_DEFAULT);

  useEffect(() => {
    fetch('/api/website/public')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.portfolio) {
          setItems(json.data.portfolio);
        }
        const portfolioHero = json?.data?.sections?.find((s: any) => s.sectionKey === 'PORTFOLIO_HERO');
        if (portfolioHero) {
          setHero((prev) => ({
            title: portfolioHero.title || prev.title,
            highlight: portfolioHero.highlight || prev.highlight,
            description: portfolioHero.description || prev.description,
          }));
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const categories = ['ALL', ...Array.from(new Set(items.map((item) => item.category.toUpperCase())))];

  const filteredItems =
    selectedCategory === 'ALL'
      ? items
      : items.filter((item) => item.category.toUpperCase() === selectedCategory);

  return (
    <div className="min-h-screen bg-[#141210] text-[#E8E3DB] font-sans selection:bg-[#D4AF37]/30 selection:text-[#FDFBF7] overflow-x-hidden font-inter">
      <Head title="Our Portfolio & Curated Spaces" />
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

      {/* --- FILTER NAVIGATION --- */}
      <section className="py-12 border-b border-[#D4AF37]/10 bg-[#141210]/50 sticky top-[76px] z-30 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="flex flex-wrap items-center gap-6 md:gap-10">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`text-[10px] font-medium tracking-[0.2em] uppercase py-2 transition-all relative cursor-pointer cursor-expand hover:text-[#D4AF37] ${
                  selectedCategory === category
                    ? 'text-[#D4AF37] after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[1px] after:bg-[#D4AF37]'
                    : 'text-[#8C8477]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* --- PORTFOLIO LIST --- */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          {loading ? (
            <div className="text-center text-slate-500 py-12">Loading portfolio...</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[#D4AF37]/20 p-12">
              <h3 className="text-xl font-playfair text-[#FDFBF7] mb-2">No projects found</h3>
              <p className="text-sm text-[#A69F95]">We are constantly updating our portfolio. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24">
              {filteredItems.map((proj, i) => (
                <RevealSection
                  key={proj.id}
                  delay={(i % 2) * 200}
                  className="group cursor-pointer cursor-expand portfolio-card"
                >
                  <Link href={`/portfolio/${proj.id}`} className="block">
                    <div className="relative overflow-hidden aspect-[4/5] mb-8 border border-[#D4AF37]/10 group-hover:border-[#D4AF37]/35 transition-all">
                      <div className="absolute inset-0 bg-[#D4AF37]/10 mix-blend-overlay z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#141210]/60 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                      <img
                        src={proj.coverImage}
                        alt={proj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                      />
                      <div className="absolute bottom-8 left-8 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                        <span className="text-[9px] text-[#D4AF37] tracking-[0.3em] uppercase font-medium flex items-center gap-2">
                          View Details <ArrowRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start border-b border-[#D4AF37]/20 pb-6">
                      <div className="flex-1 mr-4">
                        <h4 className="text-3xl font-playfair text-[#FDFBF7] mb-2 group-hover:text-[#D4AF37] transition-colors duration-500">
                          {proj.title}
                        </h4>
                        <div className="flex items-center gap-3 mb-3">
                          <p className="text-[#A69F95] text-xs tracking-widest uppercase font-light">
                            {proj.category}
                          </p>
                          {proj.location && (
                            <p className="flex items-center gap-1 text-[#8C8477] text-xs font-light">
                              <MapPin className="h-3 w-3" />
                              {proj.location}
                            </p>
                          )}
                        </div>
                        {proj.theChallenge && (
                          <p className="text-[#8C8477] text-sm font-light leading-relaxed line-clamp-2 break-words">
                            {proj.theChallenge.length > 150 ? proj.theChallenge.slice(0, 150) + '...' : proj.theChallenge}
                          </p>
                        )}
                      </div>
                      <div className="text-[#D4AF37] group-hover:translate-x-2 transition-transform self-start mt-2">
                        <ArrowRight strokeWidth={1} />
                      </div>
                    </div>
                  </Link>
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
        
        .portfolio-card .relative::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(212,175,55,0.05), transparent);
          transform: skewX(-20deg);
          transition: none;
          z-index: 15;
          pointer-events: none;
        }
        .portfolio-card:hover .relative::after {
          left: 160%;
          transition: left 0.8s ease;
        }
      `}} />
    </div>
  );
}
