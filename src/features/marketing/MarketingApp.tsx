
import React from 'react';
import LandingPage from '../landing/LandingPage';
import AboutPage from '../landing/AboutPage';
import CareersPage from '../landing/CareersPage';
import ContactPage from '../landing/ContactPage';
import LoginPage from '../auth/LoginPage';
import SignupPage from '../auth/SignupPage';
import OnboardingWizard from '../onboarding/OnboardingWizard';
import SkeletonLoader from '../../shared/SkeletonLoader';
import { Organization } from '../../types';

interface MarketingAppProps {
    currentView: string;
    onLogin: (email: string) => void;
    onSignup: (email: string) => void;
    onSsoLogin: (email: string) => void;
    onOnboardingComplete: (data: { name: string; company: string }) => void;
    signupEmail: string | null;
    isLoadingUsers: boolean;
    organizations: Organization[];
}

const MarketingApp: React.FC<MarketingAppProps> = ({
    currentView,
    onLogin,
    onSignup,
    onSsoLogin,
    onOnboardingComplete,
    signupEmail,
    isLoadingUsers,
    organizations
}) => {
    switch (currentView) {
        case 'signup':
            return <SignupPage onSignup={onSignup} />;
        case 'welcome':
            return !signupEmail ? <SkeletonLoader className="h-screen w-screen" /> : <OnboardingWizard onComplete={onOnboardingComplete} email={signupEmail} />;
        case 'about':
            return <AboutPage />;
        case 'careers':
            return <CareersPage />;
        case 'contact':
            return <ContactPage />;
        case 'login':
            return <LoginPage onLogin={onLogin} isLoading={isLoadingUsers} organizations={organizations} onSsoLogin={onSsoLogin} />;
        default:
            return <LandingPage />;
    }
};

export default MarketingApp;
