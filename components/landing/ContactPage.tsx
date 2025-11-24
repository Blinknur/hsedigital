
import React from 'react';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';

const ContactPage: React.FC = () => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Thank you for your message! We'll get back to you shortly.");
        (e.target as HTMLFormElement).reset();
    };

    return (
        <div className="bg-white text-slate-700">
            <SiteHeader />

            <main>
                <header className="page-header">
                    <div className="container mx-auto px-6">
                        <h1 className="page-title">Get in Touch</h1>
                        <p className="page-subtitle">Have a question or want to see a demo? We'd love to hear from you. Reach out, and we'll get back to you as soon as possible.</p>
                    </div>
                </header>

                <section className="content-section">
                    <div className="container mx-auto px-6">
                        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                            {/* Contact Form */}
                            <div>
                                <h2 className="section-title mb-6">Send Us a Message</h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label htmlFor="name" className="form-label">Full Name</label>
                                        <input type="text" id="name" className="form-input" required />
                                    </div>
                                    <div>
                                        <label htmlFor="email" className="form-label">Email Address</label>
                                        <input type="email" id="email" className="form-input" required />
                                    </div>
                                    <div>
                                        <label htmlFor="message" className="form-label">Message</label>
                                        <textarea id="message" rows={5} className="form-input" required></textarea>
                                    </div>
                                    <div>
                                        <button type="submit" className="btn btn-primary btn-lg w-full">Send Message</button>
                                    </div>
                                </form>
                            </div>

                            {/* Contact Info */}
                            <div className="bg-slate-50 p-8 rounded-lg">
                                <h2 className="section-title mb-6">Contact Information</h2>
                                <div className="space-y-6">
                                    <div>
                                        <h4 className="font-bold text-slate-800">Sales Inquiries</h4>
                                        <a href="mailto:sales@hse.digital" className="text-emerald-600 hover:text-emerald-800">sales@hse.digital</a>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Support</h4>
                                        <a href="mailto:support@hse.digital" className="text-emerald-600 hover:text-emerald-800">support@hse.digital</a>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Our Office</h4>
                                        <p className="text-slate-600">123 Compliance Avenue<br/>Karachi, Sindh 75500<br/>Pakistan</p>
                                    </div>
                                </div>
                                <div className="mt-8 h-64 bg-slate-200 rounded-lg flex items-center justify-center">
                                    <p className="text-slate-400">[ Map Placeholder ]</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
};

export default ContactPage;
