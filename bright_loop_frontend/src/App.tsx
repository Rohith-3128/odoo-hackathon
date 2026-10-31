import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TrustedBy } from './components/TrustedBy';
import { PlansModal } from './components/PlansModal';
import { BookingModal } from './components/BookingModal';
import { InfoModals } from './components/InfoModals';
import { LoginModal } from './components/LoginModal';
import { SignInModal } from './components/SignInModal';
import { NexusWorkspace } from './components/nexus/NexusWorkspace';
import { Chatbot } from './components/Chatbot';
import { User } from './api/client';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'nexus'>('landing');
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [activeInfoSection, setActiveInfoSection] = useState<
    'projects' | 'team' | 'faqs' | 'contact' | null
  >(null);

  const handleSelectPlan = () => {
    setIsPlansOpen(false);
    setIsBookingOpen(true);
  };

  const handleLoginSuccess = (user: User) => {
    setAuthenticatedUser(user);
    setIsLoginOpen(false);
    setIsSignInOpen(false);
    setCurrentView('nexus');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    setAuthenticatedUser(null);
  };

  return (
    <>
      {currentView === 'nexus' ? (
        <NexusWorkspace
          authenticatedUser={authenticatedUser}
          onBackToLanding={handleBackToLanding}
        />
      ) : (
        <main style={{ minHeight: '100vh', width: '100%', position: 'relative' }}>
          {/* Fixed Navbar with Brand Logo, Sign In, and Login buttons */}
          <Navbar
            onOpenSignIn={() => {
              setIsLoginOpen(false);
              setIsSignInOpen(true);
            }}
            onOpenLogin={() => {
              setIsSignInOpen(false);
              setIsLoginOpen(true);
            }}
            onLogoClick={() => {
              setIsPlansOpen(false);
              setIsBookingOpen(false);
              setActiveInfoSection(null);
              setIsLoginOpen(false);
              setIsSignInOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Hero Section */}
          <Hero
            onOpenPlans={() => setIsPlansOpen(true)}
            onOpenBooking={() => setIsBookingOpen(true)}
            onOpenLogin={() => {
              setIsSignInOpen(false);
              setIsLoginOpen(true);
            }}
          />

          {/* TrustedBy Section */}
          <TrustedBy />

          {/* Login Modal */}
          <LoginModal
            isOpen={isLoginOpen}
            onClose={() => setIsLoginOpen(false)}
            onOpenSignIn={() => {
              setIsLoginOpen(false);
              setIsSignInOpen(true);
            }}
            onLoginSuccess={handleLoginSuccess}
          />

          {/* Sign In as New Person Modal */}
          <SignInModal
            isOpen={isSignInOpen}
            onClose={() => setIsSignInOpen(false)}
            onOpenLogin={() => {
              setIsSignInOpen(false);
              setIsLoginOpen(true);
            }}
            onLoginSuccess={handleLoginSuccess}
          />

          {/* Interactive Modals */}
          <PlansModal
            isOpen={isPlansOpen}
            onClose={() => setIsPlansOpen(false)}
            onSelectPlan={handleSelectPlan}
          />

          <BookingModal
            isOpen={isBookingOpen}
            onClose={() => setIsBookingOpen(false)}
          />

          <InfoModals
            type={activeInfoSection}
            onClose={() => setActiveInfoSection(null)}
          />
        </main>
      )}

      {/* Floating Instant Answers Chatbot at the bottom right corner */}
      <Chatbot />
    </>
  );
}
