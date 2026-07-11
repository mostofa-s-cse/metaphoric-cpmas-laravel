import React, { useEffect, useState } from 'react';

export default function CustomCursor() {
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
      <div
        className={`w-1.5 h-1.5 bg-[#D4AF37] rounded-full transition-opacity duration-200 ${
          isHovering ? 'opacity-0' : 'opacity-100'
        }`}
      />
    </div>
  );
}
