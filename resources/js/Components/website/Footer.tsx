import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const BRAND = {
  name: 'Metaphoric',
  nameAlt: 'Metaphoric Architect',
  tagline: 'Architect',
  city: 'Dhaka, Bangladesh',
  facebook: 'https://www.facebook.com/metaphoricarchitect',
  instagram: 'https://www.instagram.com/',
  email: 'info@metaphoricarchitect.com',
  phone: '+880 1XXX-XXXXXX',
  address: 'Dhaka, Bangladesh',
  followers: '15.8K',
};

export default function Footer() {
  const [brand, setBrand] = useState(BRAND);
  const [services, setServices] = useState<any[]>([]);

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

  return (
    <footer id="contact" className="relative bg-[#141210] pt-40 pb-12 overflow-hidden border-t border-[#D4AF37]/10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="flex flex-col lg:flex-row justify-between items-start mb-32 pb-20 gap-20">
          <div className="lg:w-1/2">
            <h2 className="text-5xl md:text-7xl font-playfair text-[#FDFBF7] leading-tight mb-8">
              Let's build your <br />
              <i className="text-[#D4AF37]">vision.</i>
            </h2>
            <p className="text-[#A69F95] text-lg font-light mb-16 max-w-md leading-relaxed">
              Reach out to discuss your residential, commercial, or urban project in {brand.city} and across Bangladesh.
            </p>
            <div className="space-y-10">
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
                <p className="text-lg font-light text-[#E8E3DB] leading-relaxed">
                  {brand.address}
                </p>
              </div>
              <div>
                <h5 className="text-[9px] font-medium tracking-[0.3em] text-[#8C8477] uppercase mb-3">Follow</h5>
                <a
                  href={brand.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-[#E8E3DB] hover:text-[#D4AF37] transition-colors cursor-expand"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="font-playfair italic text-lg">
                    {brand.facebook ? brand.facebook.split('/').filter(Boolean).pop() : 'metaphoricarchitect'}
                  </span>
                  <span className="text-[#D4AF37] text-xs tracking-widest">({brand.followers} fans)</span>
                </a>
              </div>
            </div>
          </div>

          <div className="lg:w-1/2 w-full bg-[#1A1816] border border-[#D4AF37]/20 p-10 md:p-14">
            <h3 className="text-2xl font-playfair text-[#FDFBF7] mb-10">Begin a dialogue</h3>
            <form
              className="space-y-10"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const data = {
                  name: (form.elements.namedItem('name') as HTMLInputElement).value,
                  email: (form.elements.namedItem('email') as HTMLInputElement).value,
                  scope: (form.elements.namedItem('scope') as HTMLSelectElement).value,
                  details: (form.elements.namedItem('details') as HTMLTextAreaElement).value,
                };
                const btn = form.elements.namedItem('submitBtn') as HTMLButtonElement;
                const originalText = btn.innerText;
                btn.innerText = 'Submitting...';
                btn.disabled = true;

                try {
                  const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                  });
                  if (res.ok) {
                    form.reset();
                    btn.innerText = 'Sent Successfully';
                    setTimeout(() => {
                      btn.innerText = originalText;
                      btn.disabled = false;
                    }, 3000);
                  } else {
                    btn.innerText = 'Error! Try Again';
                    setTimeout(() => {
                      btn.innerText = originalText;
                      btn.disabled = false;
                    }, 3000);
                  }
                } catch (err) {
                  btn.innerText = 'Error! Try Again';
                  setTimeout(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                  }, 3000);
                }
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div>
                  <label className="block text-[9px] font-medium tracking-[0.3em] text-[#8C8477] uppercase mb-3">
                    Name
                  </label>
                  <input
                    name="name"
                    required
                    type="text"
                    className="w-full bg-transparent border-0 border-b border-[#D4AF37]/20 pb-4 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] transition-colors placeholder:text-[#3A3530] font-light text-sm"
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
                    className="w-full bg-transparent border-0 border-b border-[#D4AF37]/20 pb-4 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] transition-colors placeholder:text-[#3A3530] font-light text-sm"
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
                  className="w-full bg-transparent border-0 border-b border-[#D4AF37]/20 pb-4 text-[#E8E3DB] focus:outline-none focus:border-[#D4AF37] transition-colors font-light text-sm appearance-none cursor-pointer"
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
                  rows={3}
                  className="w-full bg-transparent border-0 border-b border-[#D4AF37]/20 pb-4 text-[#FDFBF7] focus:outline-none focus:border-[#D4AF37] transition-colors placeholder:text-[#3A3530] font-light text-sm resize-none"
                  placeholder="Share your vision with us..."
                ></textarea>
              </div>
              <button
                name="submitBtn"
                type="submit"
                className="w-full py-5 bg-[#D4AF37] hover:bg-[#E5C158] text-[#141210] font-medium tracking-[0.3em] uppercase text-[10px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Inquiry
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] font-medium tracking-widest uppercase text-[#8C8477] border-t border-[#D4AF37]/10 pt-10">
          <p>
            &copy; {new Date().getFullYear()} {brand.nameAlt} — {brand.city}
          </p>
          <div className="flex gap-10">
            <a
              href={brand.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#D4AF37] transition-colors"
            >
              Facebook
            </a>
            <a
              href={brand.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#D4AF37] transition-colors"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
