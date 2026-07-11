import React, { useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import { Menu, X, ArrowRight, Building2 } from 'lucide-react';

const BRAND = {
  name: 'Metaphoric',
  nameAlt: 'Metaphoric Architect',
  tagline: 'Architect',
  followers: '15.8K',
  facebook: 'https://www.facebook.com/metaphoricarchitect',
  logoUrl: '',
  faviconUrl: '',
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [brand, setBrand] = useState(BRAND);
  const [pathname, setPathname] = useState('/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPathname(window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetch('/api/website/public')
      .then((res) => res.json())
      .then((json) => {
        if (json?.data?.settings?.BRAND_INFO) {
          setBrand((prev) => ({ ...prev, ...json.data.settings.BRAND_INFO }));
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (res.ok) setIsLoggedIn(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'Portfolio', href: '/portfolio' },
    { label: 'Team', href: '/team' },
    { label: 'Contact', href: '/#contact' },
  ];

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-700 ${
        scrolled
          ? 'bg-[#141210]/95 backdrop-blur-xl border-b border-[#D4AF37]/10 py-4'
          : 'bg-transparent py-8'
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 group cursor-pointer cursor-expand">
            <div className="h-12 w-12 border border-[#D4AF37]/30 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 group-hover:border-[#D4AF37] overflow-hidden">
              {brand.logoUrl ? (
                <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-cover" />
              ) : (
                <Building2 className="h-5 w-5 text-[#D4AF37]" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-playfair tracking-[0.1em] text-[#FDFBF7] uppercase leading-none">
                {brand.name}
              </span>
              <span className="text-[9px] font-medium tracking-[0.4em] text-[#D4AF37] uppercase leading-none mt-2">
                {brand.tagline}
              </span>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-12">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`text-xs font-light tracking-[0.2em] uppercase transition-colors relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-[#D4AF37] hover:after:w-full after:transition-all after:duration-500 ${
                    isActive ? 'text-[#D4AF37] after:w-full' : 'text-[#A69F95] hover:text-[#D4AF37]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* FB Social badge */}
            <a
              href={brand.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:flex items-center gap-2 text-[9px] text-[#A69F95] tracking-widest uppercase hover:text-[#D4AF37] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              {brand.followers} Fans
            </a>

            <div className="h-8 w-[1px] bg-[#D4AF37]/20 mx-4"></div>

            <Link
              href={isLoggedIn ? '/dashboard' : '/login'}
              className="px-8 py-3 text-[10px] font-medium tracking-[0.2em] uppercase text-[#141210] bg-[#D4AF37] hover:bg-[#E5C158] transition-all flex items-center gap-3 hover:shadow-[0_0_40px_rgba(212,175,55,0.2)]"
            >
              {isLoggedIn ? 'Dashboard' : 'Login'}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden text-[#D4AF37] p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X strokeWidth={1.5} /> : <Menu strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 w-full bg-[#141210]/98 backdrop-blur-3xl border-b border-[#D4AF37]/10 transition-all duration-500 overflow-hidden ${
          mobileMenuOpen ? 'max-h-[400px] py-8' : 'max-h-0 py-0'
        }`}
      >
        <div className="flex flex-col gap-8 px-6">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-light tracking-[0.2em] text-[#E8E3DB] uppercase hover:text-[#D4AF37] transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={brand.facebook}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileMenuOpen(false)}
            className="text-sm font-light tracking-[0.2em] text-[#A69F95] uppercase hover:text-[#D4AF37] transition-colors"
          >
            Facebook — {brand.followers} Fans
          </a>
          <Link
            href={isLoggedIn ? '/dashboard' : '/login'}
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex items-center gap-3 text-[#D4AF37] text-sm font-medium tracking-widest uppercase mt-4"
          >
            {isLoggedIn ? 'Dashboard' : 'Login'} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
