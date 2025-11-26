
import React, { useRef } from 'react';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

const LandingPage: React.FC = () => {
    const featuresRef = useRef<HTMLElement>(null);
    const pricingRef = useRef<HTMLElement>(null);
    const testimonialsRef = useRef<HTMLElement>(null);
    const contactRef = useRef<HTMLElement>(null);
    const aboutRef = useRef<HTMLElement>(null);

    const navLinks = {
        features: featuresRef,
        pricing: pricingRef,
        testimonials: testimonialsRef,
        contact: contactRef,
        about: aboutRef
    };

    return (
        <div className="bg-slate-50 text-slate-700">
            <SiteHeader navLinks={navLinks} />

            <main>
                <section className="hero-section relative pt-32 pb-20 overflow-hidden">
                    <div className="container mx-auto px-6 text-center relative z-10">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight tracking-tighter">
                            Streamline Compliance, <br className="hidden md:block" />Elevate Safety Standards.
                        </h1>
                        <p className="mt-6 max-w-3xl mx-auto text-lg text-slate-600 leading-relaxed">
                            HSE.Digital is the all-in-one platform for managing internal audits, safety checklists, and compliance across all your facilities. Go from complex paperwork to clear, actionable insights.
                        </p>
                        <div className="mt-8 flex justify-center space-x-4">
                            <a href="/#/signup" className="btn btn-primary btn-lg">Start Your Free Trial</a>
                            <a href="#features" onClick={(e) => { e.preventDefault(); featuresRef.current?.scrollIntoView({ behavior: 'smooth' }); }} className="btn btn-secondary btn-lg">Explore Features</a>
                        </div>
                        <div className="mt-16 max-w-5xl mx-auto">
                            <div className="browser-frame">
                                <div className="browser-header">
                                    <div className="flex space-x-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    </div>
                                </div>
                                <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069&auto=format&fit=crop" alt="A compliance manager using a tablet in an industrial setting" className="w-full h-auto object-cover" />
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-12 bg-white">
                    <div className="container mx-auto px-6">
                        <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-wider">Trusted by industry leaders</p>
                        <div className="mt-6 flex flex-wrap justify-center items-center gap-x-12 gap-y-4">
                            <span className="opacity-60 text-lg font-semibold">Total Parco</span>
                            <span className="opacity-60 text-lg font-semibold">Shell</span>
                            <span className="opacity-60 text-lg font-semibold">PSO</span>
                            <span className="opacity-60 text-lg font-semibold">Hascol</span>
                        </div>
                    </div>
                </section>

                <section id="features" ref={featuresRef} className="py-20 bg-white">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tighter">Everything You Need for Total Compliance</h2>
                            <p className="mt-4 max-w-2xl mx-auto text-slate-600 leading-relaxed">From daily checks to enterprise-level audits, our platform adapts to your workflow.</p>
                        </div>
                        <div className="space-y-16">
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <img src="https://images.unsplash.com/photo-1590650046872-9f3a25a7a72b?q=80&w=1470&auto=format&fit=crop" alt="A person filling out a digital checklist on a tablet in a clean service bay" className="rounded-lg shadow-lg"/>
                                <div>
                                    <div className="feature-icon bg-emerald-100 text-emerald-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 mt-4">Dynamic Checklists & Audits</h3>
                                    <p className="text-slate-600 leading-relaxed">Create, schedule, and execute custom audits and daily checklists. Capture findings, photos, and root causes on the fly from any device, ensuring standardized procedures across all locations.</p>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <div className="md:order-2">
                                    <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1470&auto=format&fit=crop" alt="A team collaborating on a project management board" className="rounded-lg shadow-lg"/>
                                </div>
                                <div className="md:order-1">
                                    <div className="feature-icon bg-blue-100 text-blue-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 mt-4">Automated Corrective Action Tracking (CAPA)</h3>
                                    <p className="text-slate-600 leading-relaxed">Never let a critical issue slip through the cracks. Assign, track, and approve corrective actions with a full audit trail. Get automatic alerts and escalations for overdue tasks to ensure accountability.</p>
                                </div>
                            </div>
                            <div className="grid md:grid-cols-2 gap-12 items-center">
                                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1470&auto=format&fit=crop" alt="A modern analytics dashboard with various charts and graphs on a computer screen" className="rounded-lg shadow-lg"/>
                                <div>
                                    <div className="feature-icon bg-indigo-100 text-indigo-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-3 mt-4">AI-Powered Analytics & Dashboards</h3>
                                    <p className="text-slate-600 leading-relaxed">Visualize your entire operation's compliance health in real-time. Leverage our AI assistant to generate executive summaries, identify risk trends, and get actionable recommendations from your data.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <section id="pricing" ref={pricingRef} className="py-20 bg-slate-50">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tighter">Pricing Plans for Every Team</h2>
                            <p className="mt-4 max-w-2xl mx-auto text-slate-600 leading-relaxed">Start for free and scale as you grow. All plans include our core compliance features.</p>
                        </div>
                        <div className="grid lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <div className="pricing-card">
                                <h3 className="pricing-title">Starter</h3>
                                <p className="pricing-desc">For small businesses or single facilities just getting started.</p>
                                <p className="pricing-price">$29 <span className="pricing-period">/ month</span></p>
                                <ul className="pricing-features">
                                    <li>1 Facility/Station</li>
                                    <li>Up to 5 Users</li>
                                    <li>Core Compliance Features</li>
                                    <li>Incident Reporting</li>
                                    <li>Basic Reporting</li>
                                </ul>
                                <a href="/#/signup" className="btn btn-secondary w-full">Choose Starter</a>
                            </div>
                            <div className="pricing-card popular">
                                <h3 className="pricing-title">Professional</h3>
                                <p className="pricing-desc">For growing businesses managing multiple locations.</p>
                                <p className="pricing-price">$99 <span className="pricing-period">/ month</span></p>
                                <ul className="pricing-features">
                                    <li>Up to 10 Facilities</li>
                                    <li>Up to 25 Users</li>
                                    <li>Advanced Audit Planning</li>
                                    <li>AI-Powered Analytics</li>
                                    <li>Priority Email Support</li>
                                </ul>
                                <a href="/#/signup" className="btn btn-primary w-full">Choose Professional</a>
                            </div>
                            <div className="pricing-card">
                                <h3 className="pricing-title">Enterprise</h3>
                                <p className="pricing-desc">For large organizations with custom needs.</p>
                                <p className="pricing-price">Custom</p>
                                <ul className="pricing-features">
                                    <li>Unlimited Facilities & Users</li>
                                    <li>Single Sign-On (SSO)</li>
                                    <li>Custom Integrations</li>
                                    <li>Dedicated Account Manager</li>
                                    <li>On-premise Deployment Option</li>
                                </ul>
                                <a href="/#/contact" className="btn btn-secondary w-full">Contact Sales</a>
                            </div>
                        </div>
                    </div>
                </section>
                
                <section id="testimonials" ref={testimonialsRef} className="py-20 bg-white">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tighter">Why Managers Love HSE.Digital</h2>
                        </div>
                        <div className="grid lg:grid-cols-2 gap-8">
                            <div className="testimonial-card">
                                <p className="testimonial-text">"HSE.Digital transformed our compliance workflow. We've cut audit time by 50% and have a real-time view of risks across all our stations. The CAPA tracking is a game-changer."</p>
                                <div className="testimonial-author flex items-center space-x-4">
                                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop" alt="Bilal Ahmed"/>
                                    <div>
                                        <p className="font-semibold text-slate-800">Bilal Ahmed</p>
                                        <p className="text-sm text-slate-500">Compliance Manager, Karachi Region</p>
                                    </div>
                                </div>
                            </div>
                            <div className="testimonial-card">
                                <p className="testimonial-text">"As a station manager, daily checklists are now quick and easy. Reporting an incident takes seconds, not hours of paperwork. My team can focus more on customers and safety."</p>
                                <div className="testimonial-author flex items-center space-x-4">
                                     <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=300&auto=format&fit=crop" alt="Fatima Ali"/>
                                    <div>
                                        <p className="font-semibold text-slate-800">Fatima Ali</p>
                                        <p className="text-sm text-slate-500">Station Manager, Clifton Fuel Centre</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                
                <section className="py-20 bg-slate-50">
                    <div className="container mx-auto px-6 text-center">
                         <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tighter">Ready to Take Control of Your Compliance?</h2>
                         <p className="mt-4 max-w-2xl mx-auto text-slate-600 leading-relaxed">Join dozens of businesses streamlining their safety and compliance operations with HSE.Digital. Start your free trial today. No credit card required.</p>
                         <div className="mt-8">
                             <a href="/#/signup" className="btn btn-primary btn-lg">Sign Up for Free</a>
                         </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
};

export default LandingPage;
