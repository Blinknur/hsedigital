
import React, { useState, useEffect, useRef } from 'react';

interface SiteHeaderProps {
    navLinks?: {
        [key: string]: React.RefObject<HTMLElement>;
    };
}

const SiteHeader: React.FC<SiteHeaderProps> = ({ navLinks }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
    
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 10) setIsHeaderScrolled(true);
            else setIsHeaderScrolled(false);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToSection = (ref: React.RefObject<HTMLElement>) => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
        setIsMenuOpen(false);
    };

    // FIX: Made children optional in type definition to resolve TS error "Property 'children' is missing".
    const NavLink = ({ href, children, sectionRef }: { href: string; children?: React.ReactNode, sectionRef?: React.RefObject<HTMLElement> }) => {
        const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            if (sectionRef) {
                e.preventDefault();
                scrollToSection(sectionRef);
            } else {
                // Allow default navigation for external-like links
                setIsMenuOpen(false);
            }
        };

        return <a href={href} onClick={handleClick} className="nav-link text-sm font-medium text-slate-600 hover:text-slate-900">{children}</a>
    };

    return (
        <header ref={headerRef} className={`landing-header fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md transition-all duration-300 ${isHeaderScrolled ? 'scrolled' : ''}`}>
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <a href="/#/" className="text-2xl font-bold text-slate-800 tracking-tighter">
                    HSE<span className="text-emerald-500">.Digital</span>
                </a>
                <nav className="hidden md:flex space-x-8 items-center">
                    <NavLink href="#features" sectionRef={navLinks?.features}>Features</NavLink>
                    <NavLink href="#pricing" sectionRef={navLinks?.pricing}>Pricing</NavLink>
                    <NavLink href="/#/about">About</NavLink>
                    <NavLink href="/#/contact">Contact</NavLink>
                </nav>
                <div className="hidden md:flex items-center space-x-2">
                    <a href="/#/login" className="text-sm font-semibold text-slate-600 hover:text-emerald-500 transition-colors py-2 px-4">Log In</a>
                    <a href="/#/signup" className="btn btn-primary">Get Started</a>
                </div>
                <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
            </div>
            {isMenuOpen && (
                 <div className="md:hidden px-6 pb-4 space-y-2 border-t border-slate-200 bg-white/95">
                    <a href="#features" onClick={(e) => { e.preventDefault(); scrollToSection(navLinks!.features); }} className="block py-2 nav-link text-sm font-medium text-slate-600 hover:text-slate-900">Features</a>
                    <a href="#pricing" onClick={(e) => { e.preventDefault(); scrollToSection(navLinks!.pricing); }} className="block py-2 nav-link text-sm font-medium text-slate-600 hover:text-slate-900">Pricing</a>
                    <a href="/#/about" onClick={() => setIsMenuOpen(false)} className="block py-2 nav-link text-sm font-medium text-slate-600 hover:text-slate-900">About</a>
                    <a href="/#/contact" onClick={() => setIsMenuOpen(false)} className="block py-2 nav-link text-sm font-medium text-slate-600 hover:text-slate-900">Contact</a>
                    <div className="border-t pt-4 space-y-2">
                        <a href="/#/login" className="block text-center text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors py-2 px-4 rounded-lg">Log In</a>
                        <a href="/#/signup" className="block text-center btn btn-primary w-full">Get Started</a>
                    </div>
                </div>
            )}
        </header>
    );
};

export default SiteHeader;
