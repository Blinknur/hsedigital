
import React from 'react';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

const AboutPage: React.FC = () => {
    return (
        <div className="bg-white text-slate-700">
            <SiteHeader />

            <main>
                <header className="page-header">
                    <div className="container mx-auto px-6">
                        <h1 className="page-title">Our Mission: Safer Workplaces, Simplified Compliance.</h1>
                        <p className="page-subtitle">We believe that every employee deserves a safe working environment, and every business deserves a straightforward path to achieving and maintaining compliance.</p>
                    </div>
                </header>

                <section className="content-section">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="section-title mb-4">Our Story</h2>
                                <div className="prose prose-slate max-w-none text-slate-600">
                                    <p>Founded by a team of veteran HSE professionals and tech innovators, HSE.Digital was born out of a common frustration: compliance management was stuck in the past. We saw firsthand how cumbersome paperwork, disconnected systems, and a lack of real-time data were holding businesses back and putting people at risk.</p>
                                    <p>We knew there had to be a better way. Our goal was to build a single, intuitive platform that empowers teams on the ground and gives leaders the visibility they need to make informed decisions. Today, HSE.Digital is trusted by leading companies to turn complex regulations into simple, actionable workflows.</p>
                                </div>
                            </div>
                            <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1470&auto=format&fit=crop" alt="A diverse team collaborating in a modern office" className="rounded-lg shadow-lg" />
                        </div>
                    </div>
                </section>
                
                <section className="content-section bg-slate-50">
                    <div className="container mx-auto px-6 text-center">
                         <h2 className="section-title mb-12">Our Core Values</h2>
                         <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Safety First, Always</h3>
                                <p className="text-slate-600">Our commitment to safety is uncompromising. It's the foundation of our platform and the core of our identity.</p>
                            </div>
                             <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Innovation with Purpose</h3>
                                <p className="text-slate-600">We build powerful, easy-to-use tools that solve real-world problems and make a tangible impact on our clients' operations.</p>
                            </div>
                             <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Integrity and Trust</h3>
                                <p className="text-slate-600">We are committed to being a reliable partner, handling our clients' critical data with the utmost security and transparency.</p>
                            </div>
                         </div>
                    </div>
                </section>

                <section className="content-section">
                    <div className="container mx-auto px-6 text-center">
                         <h2 className="section-title mb-12">Meet the Leadership</h2>
                         <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                            <div className="team-card">
                                <img src="https://images.unsplash.com/photo-1568602471122-7832951cc4c5?q=80&w=870&auto=format&fit=crop" alt="Team member photo"/>
                                <h4 className="team-card-name">Aamir Khan</h4>
                                <p className="team-card-title">Chief Executive Officer</p>
                            </div>
                            <div className="team-card">
                                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=776&auto=format&fit=crop" alt="Team member photo"/>
                                <h4 className="team-card-name">Nida Dar</h4>
                                <p className="team-card-title">Head of Product</p>
                            </div>
                            <div className="team-card">
                                <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=774&auto=format&fit=crop" alt="Team member photo"/>
                                <h4 className="team-card-name">Usman Malik</h4>
                                <p className="team-card-title">Chief Technology Officer</p>
                            </div>
                             <div className="team-card">
                                <img src="https://images.unsplash.com/photo-1627843563095-2df5320b6196?q=80&w=774&auto=format&fit=crop" alt="Team member photo"/>
                                <h4 className="team-card-name">Zainab Hasan</h4>
                                <p className="team-card-title">Head of Customer Success</p>
                            </div>
                         </div>
                    </div>
                </section>

            </main>

            <SiteFooter />
        </div>
    );
};

export default AboutPage;
