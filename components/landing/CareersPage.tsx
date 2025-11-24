
import React from 'react';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

const CareersPage: React.FC = () => {
    const jobOpenings = [
        { title: "Senior Frontend Engineer", location: "Remote", department: "Engineering" },
        { title: "HSE Compliance Specialist", location: "Lahore, Pakistan", department: "Customer Success" },
        { title: "Product Manager", location: "Remote", department: "Product" },
        { title: "DevOps Engineer", location: "Karachi, Pakistan", department: "Engineering" },
    ];

    return (
        <div className="bg-slate-50 text-slate-700">
            <SiteHeader />

            <main>
                <header className="page-header">
                    <div className="container mx-auto px-6">
                        <h1 className="page-title">Join Our Mission</h1>
                        <p className="page-subtitle">We're building the future of workplace safety and compliance. We're looking for passionate, talented people to help us make a difference.</p>
                    </div>
                </header>
                
                <section className="content-section bg-white">
                    <div className="container mx-auto px-6 max-w-5xl">
                        <h2 className="section-title text-center mb-12">Why Work With Us?</h2>
                        <div className="grid md:grid-cols-3 gap-8 text-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Make a Real Impact</h3>
                                <p className="text-slate-600">Your work will directly contribute to creating safer environments for thousands of workers across various industries.</p>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Culture of Growth</h3>
                                <p className="text-slate-600">We invest in our team's professional development with learning stipends, mentorship programs, and opportunities for advancement.</p>
                            </div>
                             <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Flexible & Remote-First</h3>
                                <p className="text-slate-600">We trust our team to do their best work, wherever they are. We offer flexible hours and remote work options to support work-life balance.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="content-section">
                    <div className="container mx-auto px-6 max-w-4xl">
                        <h2 className="section-title text-center mb-12">Open Positions</h2>
                        <div className="space-y-4">
                            {jobOpenings.map((job, index) => (
                                <div key={index} className="job-card">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">{job.title}</h3>
                                        <p className="text-sm text-slate-500">{job.department} &middot; {job.location}</p>
                                    </div>
                                    <div className="mt-4 sm:mt-0">
                                        <a href="#" className="btn btn-secondary">View Details</a>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-12 text-center p-8 bg-white rounded-lg border-2 border-dashed">
                             <h3 className="text-xl font-bold text-slate-800">Don't See Your Role?</h3>
                             <p className="text-slate-600 mt-2">We're always looking for talented people. If you're passionate about our mission, send us your resume!</p>
                             <div className="mt-4">
                                <a href="mailto:careers@hse.digital" className="btn btn-primary">Contact Us</a>
                             </div>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
};

export default CareersPage;
