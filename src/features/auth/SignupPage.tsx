import React, { useState, useEffect, useCallback } from 'react';
import { client } from '../../api/client';

interface SignupPageProps {
    onSignup?: (email: string) => void;
}

interface PasswordStrength {
    score: number;
    label: string;
    color: string;
    feedback: string[];
}

const SignupPage: React.FC<SignupPageProps> = ({ onSignup }) => {
    const [step, setStep] = useState<'details' | 'verification'>('details');
    const [organizationName, setOrganizationName] = useState('');
    const [subdomain, setSubdomain] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    
    const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
    const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
    const [subdomainError, setSubdomainError] = useState('');
    
    const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
        score: 0,
        label: '',
        color: '',
        feedback: []
    });
    const [showPassword, setShowPassword] = useState(false);

    const calculatePasswordStrength = (pwd: string): PasswordStrength => {
        if (!pwd) {
            return { score: 0, label: '', color: '', feedback: [] };
        }

        let score = 0;
        const feedback: string[] = [];

        if (pwd.length >= 8) score++;
        else feedback.push('At least 8 characters');

        if (pwd.length >= 12) score++;
        
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
        else feedback.push('Mix of uppercase and lowercase');
        
        if (/\d/.test(pwd)) score++;
        else feedback.push('Include numbers');
        
        if (/[^a-zA-Z0-9]/.test(pwd)) score++;
        else feedback.push('Include special characters');

        let label = '';
        let color = '';
        
        if (score <= 1) {
            label = 'Weak';
            color = 'bg-red-500';
        } else if (score === 2) {
            label = 'Fair';
            color = 'bg-orange-500';
        } else if (score === 3) {
            label = 'Good';
            color = 'bg-yellow-500';
        } else if (score === 4) {
            label = 'Strong';
            color = 'bg-emerald-500';
        } else {
            label = 'Very Strong';
            color = 'bg-emerald-600';
        }

        return { score, label, color, feedback };
    };

    useEffect(() => {
        setPasswordStrength(calculatePasswordStrength(password));
    }, [password]);

    const generateSubdomain = (orgName: string): string => {
        return orgName
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 30);
    };

    useEffect(() => {
        if (organizationName) {
            const generated = generateSubdomain(organizationName);
            setSubdomain(generated);
        }
    }, [organizationName]);

    const checkSubdomainAvailability = useCallback(async (subdomain: string) => {
        if (!subdomain || subdomain.length < 3) {
            setSubdomainAvailable(null);
            setSubdomainError('');
            return;
        }

        if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(subdomain)) {
            setSubdomainAvailable(false);
            setSubdomainError('Only lowercase letters, numbers, and hyphens allowed');
            return;
        }

        setIsCheckingSubdomain(true);
        setSubdomainError('');

        try {
            const response = await client.get<{ available: boolean }>(
                '/auth/check-subdomain',
                { subdomain }
            );
            setSubdomainAvailable(response.available);
            if (!response.available) {
                setSubdomainError('This subdomain is already taken');
            }
        } catch (err) {
            console.error('Subdomain check failed:', err);
            setSubdomainAvailable(null);
            setSubdomainError('Unable to check availability');
        } finally {
            setIsCheckingSubdomain(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (subdomain) {
                checkSubdomainAvailability(subdomain);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [subdomain, checkSubdomainAvailability]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (passwordStrength.score < 2) {
            setError('Please use a stronger password');
            return;
        }

        if (!subdomainAvailable) {
            setError('Please choose an available subdomain');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await client.post<{ message: string; verificationToken?: string }>(
                '/auth/signup-with-org',
                {
                    organizationName,
                    subdomain,
                    name,
                    email,
                    password
                }
            );

            setSuccessMessage(response.message || 'Account created! Please check your email to verify.');
            setStep('verification');
            
        } catch (err: any) {
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <a href="/#/" className="text-3xl font-bold text-slate-800">
                        HSE<span className="text-emerald-500">.Digital</span>
                    </a>
                    <p className="text-slate-500 mt-2">Create your account</p>
                </div>
                {/* Progress Indicator */}
                <div className="mb-4">
                    <p className="text-center text-sm font-semibold text-slate-600">Step 1 of 2</p>
                    <div className="w-full bg-slate-200 rounded-full h-2 mt-1">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '50%' }}></div>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                Email address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                    placeholder="you@company.com"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !email}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Sending...' : 'Sign Up with Email'}
                            </button>
                        </div>
                    </form>
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
                                Confirm Password
                            </label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="mt-1 appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                                placeholder="••••••••"
                                disabled={isSubmitting}
                            />
                            </div>
                        </div>

                        {password && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">Password Strength:</span>
                                    {passwordStrength.label && (
                                        <span className={`text-sm font-semibold ${
                                            passwordStrength.score <= 1 ? 'text-red-600' :
                                            passwordStrength.score === 2 ? 'text-orange-600' :
                                            passwordStrength.score === 3 ? 'text-yellow-600' :
                                            'text-emerald-600'
                                        }`}>
                                            {passwordStrength.label}
                                        </span>
                                    )}
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full transition-all ${passwordStrength.color}`}
                                        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                                    ></div>
                                </div>
                                {passwordStrength.feedback.length > 0 && (
                                    <ul className="text-xs text-slate-600 space-y-1">
                                        {passwordStrength.feedback.map((item, idx) => (
                                            <li key={idx}>• {item}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isSubmitting || !organizationName || !subdomain || !name || !email || !password || !confirmPassword || !subdomainAvailable}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-slate-400 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Creating account...
                                    </span>
                                ) : 'Create Account'}
                            </button>
                        </div>
                    </form>
                    <p className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{' '}
                        <a href="/#/login" className="font-medium text-emerald-600 hover:text-emerald-500">
                            Log in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;