import React, { useEffect, useState, useRef } from 'react';
import { Head, Link } from '@inertiajs/react';
import { 
  Menu,
  X,
  Play,
  ArrowRight,
  Building2
} from 'lucide-react';
import Navbar from '@/Components/website/Navbar';
import Footer from '@/Components/website/Footer';

// --- Reusable Scroll Reveal Component ---
const RevealSection = ({ children, className = '', delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-out transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-[0.97]'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// --- Custom Mouse Follower ---
const CustomCursor = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateCursor = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement;
      setIsHovering(!!target.closest('a, button, input, textarea, select, .cursor-expand'));
    };
    window.addEventListener('mousemove', updateCursor);
    return () => window.removeEventListener('mousemove', updateCursor);
  }, []);

  if (!mounted) return null;

  return (
    <div 
      className="hidden md:flex fixed top-0 left-0 w-8 h-8 rounded-full border border-[#D4AF37] pointer-events-none z-[100] transition-transform duration-200 ease-out items-center justify-center mix-blend-difference"
      style={{ 
        transform: `translate(${pos.x - 16}px, ${pos.y - 16}px) scale(${isHovering ? 2 : 1})`,
        backgroundColor: isHovering ? 'rgba(212, 175, 55, 0.2)' : 'transparent',
      }}
    >
      <div className={`w-1.5 h-1.5 bg-[#D4AF37] rounded-full transition-opacity duration-200 ${isHovering ? 'opacity-0' : 'opacity-100'}`} />
    </div>
  );
};

// --- Parallax counter ---
const CounterBadge = ({ value, label }: { value: string; label: string }) => {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const parsed = parseInt(value);
  const numericValue = isNaN(parsed) ? 0 : parsed;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || numericValue === 0) {
      if (numericValue === 0) setCount(0);
      return;
    }
    let start = 0;
    const step = Math.ceil(numericValue / 40) || 1;
    const interval = setInterval(() => {
      start += step;
      if (start >= numericValue) {
        setCount(numericValue);
        clearInterval(interval);
      } else {
        setCount(start);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [visible, numericValue]);

  return (
    <div ref={ref} className="absolute -bottom-10 -right-10 bg-[#1A1816] border border-[#D4AF37]/20 text-[#FDFBF7] p-10 hidden md:block">
      <span className="block text-6xl font-playfair italic mb-4 text-[#D4AF37]">{count}</span>
      <span className="block text-[10px] font-light tracking-[0.2em] uppercase leading-relaxed">{label}</span>
    </div>
  );
};

export default function LandingPage() {
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [dynamicBrand, setDynamicBrand] = useState({
    name: '',
    nameAlt: '',
    tagline: '',
    city: '',
    facebook: '',
    instagram: '',
    email: '',
    phone: '',
    address: '',
    followers: '',
    years: '',
    projects: '',
    satisfaction: '',
    studioDesc: '',
  });
  const [services, setServices] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [trustBadges, setTrustBadges] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);

  const [dynamicHero, setDynamicHero] = useState({
    subtitle: '',
    title: '',
    highlight: '',
    description: '',
    imageUrl: '',
    videoUrl: ''
  });

  const [dynamicAbout, setDynamicAbout] = useState({
    subtitle: '',
    title: '',
    highlight: '',
    description: '',
    imageUrl: ''
  });

  useEffect(() => {
    fetch('/api/website/public')
      .then(res => res.json())
      .then(json => {
        if (json?.data?.settings?.BRAND_INFO) {
          setDynamicBrand(json.data.settings.BRAND_INFO);
        }
        if (json?.data?.sections?.find((s: any) => s.sectionKey === 'HERO')) {
          const hero = json.data.sections.find((s: any) => s.sectionKey === 'HERO');
          setDynamicHero({
            subtitle: hero.subtitle || '',
            title: hero.title || '',
            highlight: hero.highlight || '',
            description: hero.description || '',
            imageUrl: hero.imageUrl || '',
            videoUrl: hero.videoUrl || ''
          });
        }
        if (json?.data?.sections?.find((s: any) => s.sectionKey === 'ABOUT_FIRM')) {
          const about = json.data.sections.find((s: any) => s.sectionKey === 'ABOUT_FIRM');
          setDynamicAbout({
            subtitle: about.subtitle || '',
            title: about.title || '',
            highlight: about.highlight || '',
            description: about.description || '',
            imageUrl: about.imageUrl || ''
          });
        }
        if (json?.data?.services) setServices(json.data.services);
        if (json?.data?.portfolio) setPortfolio(json.data.portfolio);
        if (json?.data?.team) setTeam(json.data.team);
        if (json?.data?.trustBadges) setTrustBadges(json.data.trustBadges);
        if (json?.data?.testimonials) setTestimonials(json.data.testimonials);
        if (json?.data?.faqs) setFaqs(json.data.faqs);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (res.ok) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Trigger hero animations after mount
  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setHeroLoaded(true), 100);
      return () => clearTimeout(t);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141210] flex flex-col items-center justify-center gap-6">
        <div className="h-16 w-16 border border-[#D4AF37]/30 rounded-full flex items-center justify-center animate-pulse">
          <Building2 className="h-6 w-6 text-[#D4AF37]" strokeWidth={1.5} />
        </div>
        <div className="w-48 h-1 bg-[#1A1816] rounded-full overflow-hidden border border-[#D4AF37]/10 relative">
          <div className="absolute inset-0 bg-[#D4AF37] animate-loading-bar" />
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes loadingBar {
            0% { left: -100%; right: 100%; }
            50% { left: 0%; right: 0%; }
            100% { left: 100%; right: -100%; }
          }
          .animate-loading-bar {
            animation: loadingBar 2s ease-in-out infinite;
          }
        `}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141210] text-[#E8E3DB] font-sans selection:bg-[#D4AF37]/30 selection:text-[#FDFBF7] overflow-x-hidden font-inter">
      <Head title="Premium Architecture & Design" />
      <CustomCursor />
      
      {/* --- NAVIGATION --- */}
      <Navbar />

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#141210]/55 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/20 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#141210]/85 via-transparent to-transparent z-10"></div>
          {dynamicHero.imageUrl ? (
            <img 
              src={dynamicHero.imageUrl} 
              alt="Luxury Interior Hero" 
              className="w-full h-full object-cover hero-kenburns"
              onLoad={() => setHeroLoaded(true)}
            />
          ) : null}
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-[#D4AF37]/30 rounded-full particle-float"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 20}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${4 + i * 0.5}s`,
              }}
            />
          ))}
        </div>

        <div 
          className="absolute left-6 lg:left-12 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-4 hidden lg:flex"
          style={{
            opacity: heroLoaded ? 1 : 0,
            transition: 'opacity 1s ease 1.5s',
          }}
        >
          <div className="h-32 w-[1px] bg-gradient-to-b from-transparent via-[#D4AF37]/50 to-transparent"></div>
          <span className="text-[9px] tracking-[0.4em] text-[#D4AF37]/60 uppercase" style={{ writingMode: 'vertical-rl' }}>Scroll</span>
          <div className="h-12 w-[1px] bg-gradient-to-b from-[#D4AF37]/50 to-transparent"></div>
        </div>

        <div className="relative z-20 max-w-[1400px] mx-auto px-6 lg:px-12 w-full mt-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="max-w-4xl">
              <div className="flex items-center gap-6 mb-12 overflow-hidden">
                <div 
                  className="h-[1px] bg-[#D4AF37]"
                  style={{
                    width: heroLoaded ? '64px' : '0px',
                    transition: 'width 1s cubic-bezier(0.22, 1, 0.36, 1) 0.3s',
                  }}
                ></div>
                <span 
                  className="text-[#D4AF37] text-[10px] font-medium tracking-[0.4em] uppercase"
                  style={{
                    opacity: heroLoaded ? 1 : 0,
                    transform: heroLoaded ? 'translateX(0)' : 'translateX(-20px)',
                    transition: 'opacity 0.8s ease 0.6s, transform 0.8s ease 0.6s',
                  }}
                >
                  {dynamicHero.subtitle}
                </span>
              </div>
              
              <h1 className="text-[12vw] sm:text-[8vw] md:text-8xl lg:text-[140px] font-playfair font-normal leading-[0.85] tracking-tight mb-8">
                <span 
                  className="block text-transparent stroke-text-gold italic cursor-expand"
                  style={{
                    opacity: heroLoaded ? 1 : 0,
                    transform: heroLoaded ? 'translateY(0)' : 'translateY(80px)',
                    transition: 'opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.5s, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.5s',
                  }}
                >
                  {dynamicHero.title}
                </span>
                <span 
                  className="block text-[#FDFBF7]"
                  style={{
                    opacity: heroLoaded ? 1 : 0,
                    transform: heroLoaded ? 'translateY(0)' : 'translateY(80px)',
                    transition: 'opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.8s, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.8s',
                  }}
                >
                  {dynamicHero.highlight}
                </span>
              </h1>
            </div>

            <div 
              className="md:max-w-xs flex flex-col gap-10"
              style={{
                opacity: heroLoaded ? 1 : 0,
                transform: heroLoaded ? 'translateY(0)' : 'translateY(40px)',
                transition: 'opacity 1s ease 1.2s, transform 1s ease 1.2s',
              }}
            >
              <p className="text-[#A69F95] text-sm leading-relaxed font-light break-words">
                {dynamicHero.description}
              </p>
              
              <div className="flex items-center gap-6">
                <a href={dynamicHero.videoUrl || '#'} target="_blank" rel="noopener noreferrer" className="h-16 w-16 rounded-full border border-[#D4AF37]/40 flex items-center justify-center hover:bg-[#D4AF37] hover:text-[#141210] transition-all group backdrop-blur-md cursor-expand play-pulse">
                  <Play className="h-5 w-5 fill-current ml-1 group-hover:scale-110 transition-transform" />
                </a>
                <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-[#FDFBF7]">Play Film</span>
              </div>

              <div className="flex gap-8 pt-4 border-t border-[#D4AF37]/10">
                {[{ num: dynamicBrand.projects, label: 'Projects' }, { num: dynamicBrand.followers, label: 'FB Fans' }, { num: dynamicBrand.satisfaction, label: 'Satisfaction' }].map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl font-playfair text-[#D4AF37] italic">{s.num}</div>
                    <div className="text-[9px] tracking-[0.2em] text-[#8C8477] uppercase mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#141210] to-transparent z-20"></div>
      </section>

      {/* --- TRUSTED BY / CERTIFICATIONS --- */}
      <section className="border-b border-[#D4AF37]/10 bg-[#1A1816] py-16">
        <RevealSection className="max-w-[1400px] mx-auto px-6 lg:px-12 text-center">
          <p className="text-[9px] font-medium tracking-[0.4em] text-[#8C8477] uppercase mb-12">Accredited certifications & awards</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-60 hover:opacity-90 transition-all duration-1000 cursor-expand">
            {trustBadges.map((badge: any) => (
              <div key={badge.id} className="flex flex-col items-center gap-2 filter grayscale hover:grayscale-0 transition-all">
                {badge.imageUrl ? (
                  <img src={badge.imageUrl} alt={badge.name} className="h-10 object-contain opacity-70 hover:opacity-100 transition-opacity" />
                ) : (
                  <span className="text-sm tracking-wider font-light text-[#E8E3DB]">{badge.name}</span>
                )}
                <span className="text-[8px] tracking-widest text-[#8C8477] uppercase">{badge.name}</span>
              </div>
            ))}
          </div>
        </RevealSection>
      </section>

      {/* --- THE VISION SECTION --- */}
      <section id="studio" className="py-24 md:py-36 relative">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <RevealSection className="relative group cursor-expand">
              <div className="absolute -inset-4 bg-[#D4AF37]/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
              {dynamicAbout.imageUrl ? (
                <img 
                  src={dynamicAbout.imageUrl} 
                  alt="Metaphoric Architect Studio" 
                  className="relative w-full aspect-[3/4] object-cover grayscale-[30%] group-hover:grayscale-0 transition-all duration-1000 shadow-2xl"
                />
              ) : null}
              <CounterBadge value={dynamicBrand.years} label={"Years of\nExcellence"} />
            </RevealSection>
            
            <RevealSection delay={200} className="lg:pl-10">
              <h2 className="text-[10px] font-medium tracking-[0.4em] text-[#D4AF37] uppercase mb-12 flex items-center gap-6">
                <span className="w-12 h-[1px] bg-[#D4AF37]"></span> {dynamicAbout.subtitle}
              </h2>
              <h3 className="text-4xl md:text-5xl lg:text-7xl font-playfair font-normal leading-[1.1] text-[#FDFBF7] mb-10">
                {dynamicAbout.title} <i className="text-[#D4AF37]">{dynamicAbout.highlight}</i>
              </h3>
              <p className="text-[#A69F95] text-lg leading-relaxed font-light mb-12 break-words">
                {dynamicAbout.description || dynamicBrand.studioDesc}
              </p>
              
              <ul className="space-y-6 mb-16 border-l border-[#D4AF37]/20 pl-8">
                {services.map((item: any) => (
                  <li key={item.id} className="flex items-center gap-4 text-[#E8E3DB] font-light tracking-wide text-sm">
                    <div className="h-[1px] w-4 bg-[#D4AF37]"></div>
                    {item.title}
                  </li>
                ))}
              </ul>

              <a href={dynamicBrand.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-6 text-[10px] font-medium tracking-[0.3em] uppercase text-[#FDFBF7] hover:text-[#D4AF37] transition-colors group">
                Follow on Facebook
                <span className="w-12 h-[1px] bg-[#FDFBF7] group-hover:bg-[#D4AF37] group-hover:w-20 transition-all duration-500"></span>
              </a>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* --- EXPERTISE (Bento Grid) --- */}
      <section id="design" className="py-24 bg-[#1A1816] border-y border-[#D4AF37]/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <RevealSection className="flex flex-col items-center text-center mb-24">
            <h2 className="text-[10px] font-medium tracking-[0.4em] text-[#D4AF37] uppercase mb-8 flex items-center gap-6 justify-center">
              <span className="w-12 h-[1px] bg-[#D4AF37]"></span> 02. Services <span className="w-12 h-[1px] bg-[#D4AF37]"></span>
            </h2>
            <h3 className="text-4xl md:text-6xl font-playfair text-[#FDFBF7]">What We Build.</h3>
            <p className="text-[#8C8477] text-sm mt-4 tracking-wide">{dynamicBrand.city}</p>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-auto md:h-[650px]">
            {services[0] && (
              <Link href={`/services/${services[0].id}`} className="md:col-span-2 block h-[400px] md:h-full">
                <RevealSection delay={100} className="group relative overflow-hidden bg-[#141210] cursor-expand h-full">
                  <img src={services[0].imageUrl} alt={services[0].title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/20 to-transparent"></div>
                  <div className="absolute inset-0 p-12 flex flex-col justify-end">
                    <h4 className="text-4xl font-playfair text-[#FDFBF7] mb-4 group-hover:text-[#D4AF37] transition-colors">{services[0].title}</h4>
                    <p className="text-[#A69F95] font-light max-w-md text-sm leading-relaxed break-words">
                      {services[0].description && services[0].description.length > 120 
                        ? services[0].description.slice(0, 120) + '...' 
                        : services[0].description}
                    </p>
                    <span className="text-[9px] text-[#D4AF37] tracking-[0.3em] uppercase font-medium mt-4 flex items-center gap-2">View Details <ArrowRight className="h-3 w-3" /></span>
                  </div>
                </RevealSection>
              </Link>
            )}

            <div className="flex flex-col gap-4">
              {services[1] && (
                <Link href={`/services/${services[1].id}`} className="flex-1 block h-[300px] md:h-auto">
                  <RevealSection delay={200} className="group relative overflow-hidden bg-[#141210] cursor-expand h-full">
                    <img src={services[1].imageUrl} alt={services[1].title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141210] to-transparent"></div>
                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <h4 className="text-2xl font-playfair text-[#FDFBF7] mb-3 group-hover:text-[#D4AF37] transition-colors">{services[1].title}</h4>
                      <p className="text-[#A69F95] text-xs font-light leading-relaxed break-words">
                        {services[1].description && services[1].description.length > 80 
                          ? services[1].description.slice(0, 80) + '...' 
                          : services[1].description}
                      </p>
                      <span className="text-[9px] text-[#D4AF37] tracking-[0.3em] uppercase font-medium mt-2 flex items-center gap-2">View Details <ArrowRight className="h-3 w-3" /></span>
                    </div>
                  </RevealSection>
                </Link>
              )}

              {services[2] && (
                <Link href={`/services/${services[2].id}`} className="flex-1 block h-[300px] md:h-auto">
                  <RevealSection delay={300} className="group relative overflow-hidden bg-[#141210] cursor-expand h-full">
                    <img src={services[2].imageUrl} alt={services[2].title} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 group-hover:opacity-80 transition-all duration-1000" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141210] to-transparent"></div>
                    <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <h4 className="text-2xl font-playfair text-[#FDFBF7] mb-3 group-hover:text-[#D4AF37] transition-colors">{services[2].title}</h4>
                      <p className="text-[#A69F95] text-xs font-light leading-relaxed break-words">
                        {services[2].description && services[2].description.length > 80 
                          ? services[2].description.slice(0, 80) + '...' 
                          : services[2].description}
                      </p>
                      <span className="text-[9px] text-[#D4AF37] tracking-[0.3em] uppercase font-medium mt-2 flex items-center gap-2">View Details <ArrowRight className="h-3 w-3" /></span>
                    </div>
                  </RevealSection>
                </Link>
              )}
            </div>
          </div>

          <RevealSection delay={200} className="mt-20 flex justify-center">
            <Link href="/services" className="group inline-flex items-center gap-8 px-16 py-6 border border-[#D4AF37]/30 text-[10px] font-medium tracking-[0.3em] uppercase text-[#FDFBF7] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-500 relative overflow-hidden">
              <span className="absolute inset-0 bg-[#D4AF37]/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></span>
              <span className="relative">View All Services</span>
              <ArrowRight className="h-3 w-3 relative group-hover:translate-x-2 transition-transform" />
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* --- SELECTED WORKS --- */}
      <section id="portfolio" className="py-24 md:py-36">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <RevealSection className="mb-20">
            <h2 className="text-[10px] font-medium tracking-[0.4em] text-[#D4AF37] uppercase mb-8 flex items-center gap-6">
              <span className="w-12 h-[1px] bg-[#D4AF37]"></span> 03. Portfolio
            </h2>
            <h3 className="text-4xl md:text-6xl font-playfair text-[#FDFBF7]">Curated Spaces.</h3>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24">
            {portfolio.map((proj: any, i: number) => (
              <RevealSection key={proj.id} delay={i % 2 === 0 ? 100 : 300} className={`group cursor-pointer cursor-expand portfolio-card ${i % 2 !== 0 ? 'md:mt-32' : ''}`}>
                <Link href={`/portfolio/${proj.id}`} className="block">
                  <div className="relative overflow-hidden aspect-[4/5] mb-8">
                    <div className="absolute inset-0 bg-[#D4AF37]/10 mix-blend-overlay z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141210]/60 via-transparent to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    <img 
                      src={proj.coverImage} 
                      alt={proj.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out" 
                    />
                    <div className="absolute bottom-8 left-8 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                      <span className="text-[9px] text-[#D4AF37] tracking-[0.3em] uppercase font-medium">View Project</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-start border-b border-[#D4AF37]/20 pb-6">
                    <div className="flex-1 mr-4">
                      <h4 className="text-3xl font-playfair text-[#FDFBF7] mb-2 group-hover:text-[#D4AF37] transition-colors duration-500">{proj.title}</h4>
                      <p className="text-[#A69F95] text-xs tracking-widest uppercase font-light mb-4">{proj.category}</p>
                      {proj.theChallenge && (
                        <p className="text-[#8C8477] text-sm font-light leading-relaxed line-clamp-2 break-words">
                          {proj.theChallenge.length > 120 ? proj.theChallenge.slice(0, 120) + '...' : proj.theChallenge}
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

          <RevealSection delay={200} className="mt-24 flex justify-center">
            <Link href="/portfolio" className="group inline-flex items-center gap-8 px-16 py-6 border border-[#D4AF37]/30 text-[10px] font-medium tracking-[0.3em] uppercase text-[#FDFBF7] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-500 relative overflow-hidden">
              <span className="absolute inset-0 bg-[#D4AF37]/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></span>
              <span className="relative">View All Projects</span>
              <ArrowRight className="h-3 w-3 relative group-hover:translate-x-2 transition-transform" />
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* --- TEAM & LEADERSHIP --- */}
      <section id="team" className="py-24 border-t border-[#D4AF37]/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <RevealSection className="mb-20">
            <h2 className="text-[10px] font-medium tracking-[0.4em] text-[#D4AF37] uppercase mb-8 flex items-center gap-6">
              <span className="w-12 h-[1px] bg-[#D4AF37]"></span> 04. Our Team
            </h2>
            <h3 className="text-4xl md:text-6xl font-playfair text-[#FDFBF7]">The Visionaries.</h3>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {team.map((member: any, i: number) => (
              <RevealSection key={member.id} delay={i * 150} className="group cursor-expand flex flex-col justify-between p-4 bg-[#1A1816] border border-[#D4AF37]/5 hover:border-[#D4AF37]/20 transition-all duration-500">
                <Link href={`/team/${member.id}`} className="block">
                  <div className="relative overflow-hidden aspect-[4/5] mb-8 bg-[#1A1816]">
                    <img src={member.imageUrl} alt={member.name} className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700" />
                  </div>
                  <h4 className="text-2xl font-playfair text-[#FDFBF7] mb-2 group-hover:text-[#D4AF37] transition-colors">{member.name}</h4>
                  <p className="text-[10px] text-[#D4AF37] tracking-[0.2em] uppercase mb-4">{member.role}</p>
                  <p className="text-[#A69F95] text-sm font-light leading-relaxed line-clamp-3">{member.bio}</p>
                </Link>
              </RevealSection>
            ))}
          </div>

          <RevealSection delay={200} className="mt-20 flex justify-center">
            <Link href="/team" className="group inline-flex items-center gap-8 px-16 py-6 border border-[#D4AF37]/30 text-[10px] font-medium tracking-[0.3em] uppercase text-[#FDFBF7] hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all duration-500 relative overflow-hidden">
              <span className="absolute inset-0 bg-[#D4AF37]/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-500"></span>
              <span className="relative">View All Team</span>
              <ArrowRight className="h-3 w-3 relative group-hover:translate-x-2 transition-transform" />
            </Link>
          </RevealSection>
        </div>
      </section>

      {/* --- FREQUENTLY ASKED QUESTIONS --- */}
      <section className="py-24 border-t border-[#D4AF37]/10 bg-[#1A1816]">
        <div className="max-w-[1000px] mx-auto px-6">
          <RevealSection className="text-center mb-20">
            <h2 className="text-[10px] font-medium tracking-[0.4em] text-[#D4AF37] uppercase mb-8 flex items-center gap-6 justify-center">
              <span className="w-12 h-[1px] bg-[#D4AF37]"></span> 06. Inquiries <span className="w-12 h-[1px] bg-[#D4AF37]"></span>
            </h2>
            <h3 className="text-4xl md:text-5xl font-playfair text-[#FDFBF7]">Frequently Asked Questions</h3>
          </RevealSection>

          <div className="space-y-6">
            {faqs.map((faq: any, i: number) => (
              <RevealSection key={faq.id} delay={i * 100} className="border-b border-[#D4AF37]/10 pb-6">
                <details className="group cursor-pointer">
                  <summary className="flex justify-between items-center text-lg font-medium text-[#E8E3DB] hover:text-[#D4AF37] transition-colors focus:outline-none list-none">
                    <span className="font-playfair leading-relaxed">{faq.question}</span>
                    <span className="text-[#D4AF37] transition-transform duration-300 group-open:rotate-45 text-2xl font-light">+</span>
                  </summary>
                  <p className="text-[#A69F95] text-sm font-light leading-relaxed mt-4 pl-4 border-l border-[#D4AF37]/20 select-text">
                    {faq.answer}
                  </p>
                </details>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* --- CLIENT REVIEWS --- */}
      <section className="py-24 bg-[#1A1816] relative border-t border-[#D4AF37]/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
          <RevealSection className="flex flex-col items-center text-center mb-24">
            <h2 className="text-[10px] font-medium tracking-[0.4em] text-[#D4AF37] uppercase mb-8 flex items-center gap-6 justify-center">
              <span className="w-12 h-[1px] bg-[#D4AF37]"></span> 05. Praise <span className="w-12 h-[1px] bg-[#D4AF37]"></span>
            </h2>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((review: any, i: number) => (
              <RevealSection key={review.id} delay={i * 200} className="border border-[#D4AF37]/10 p-12 relative group hover:border-[#D4AF37]/40 transition-colors duration-500 cursor-expand bg-[#141210]">
                <div className="text-8xl text-[#D4AF37]/20 absolute top-4 left-6 font-playfair leading-none italic">"</div>
                <p className="text-[#E8E3DB] font-light leading-loose mb-12 relative z-10 text-sm">
                  {review.reviewText}
                </p>
                <div className="flex items-center gap-6 relative z-10 pt-6 border-t border-[#D4AF37]/10">
                  <div>
                    <h5 className="text-[#FDFBF7] text-sm font-medium mb-1">{review.clientName}</h5>
                    <p className="text-[9px] text-[#D4AF37] tracking-[0.2em] uppercase">{review.clientRole}</p>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER CTA --- */}
      <Footer />

      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500&display=swap');
        .font-playfair { font-family: 'Playfair Display', serif; }
        .font-inter { font-family: 'Inter', sans-serif; }
        .stroke-text-gold {
          -webkit-text-stroke: 1px #D4AF37;
          color: transparent;
        }
      `}} />
    </div>
  );
}
