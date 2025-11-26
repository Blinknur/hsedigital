import React from 'react';

const SiteFooter: React.FC = () => {
    return (
        <footer className="bg-slate-900 text-slate-300">
            <div className="container mx-auto px-6 py-12">
                <div className="grid md:grid-cols-4 gap-8">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 tracking-tighter">HSE<span className="text-emerald-400">.Digital</span></h3>
                        <p className="text-sm text-slate-400">The future of compliance management.</p>
                    </div>
                    <div>
                        <h4 className="font-semibold text-white tracking-wider uppercase mb-4 text-sm">Product</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/#/#features" className="text-slate-400 hover:text-emerald-400 transition-colors">Features</a></li>
                            <li><a href="/#/#pricing" className="text-slate-400 hover:text-emerald-400 transition-colors">Pricing</a></li>
                            <li><a href="/#/login" className="text-slate-400 hover:text-emerald-400 transition-colors">Log In</a></li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-white tracking-wider uppercase mb-4 text-sm">Company</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="/#/about" className="text-slate-400 hover:text-emerald-400 transition-colors">About Us</a></li>
                            <li><a href="/#/careers" className="text-slate-400 hover:text-emerald-400 transition-colors">Careers</a></li>
                            <li><a href="/#/contact" className="text-slate-400 hover:text-emerald-400 transition-colors">Contact</a></li>
                        </ul>
                    </div>
                     <div>
                        <h4 className="font-semibold text-white tracking-wider uppercase mb-4 text-sm">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li><a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
                            <li><a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">Terms of Service</a></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
                    <p>&copy; 2024 Oil Marketing Co. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default SiteFooter;