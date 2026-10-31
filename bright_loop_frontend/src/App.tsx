import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TrustedBy } from './components/TrustedBy';
import { PlansModal } from './components/PlansModal';
import { BookingModal } from './components/BookingModal';
import { InfoModals } from './components/InfoModals';
import { LoginModal } from './components/LoginModal';
import { NexusWorkspace } from './components/nexus/NexusWorkspace';
import { User } from './api/client';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'nexus'>('landing');
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
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
    setCurrentView('nexus');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    setAuthenticatedUser(null);
  };

  if (currentView === 'nexus') {
    return (
      <NexusWorkspace
        authenticatedUser={authenticatedUser}
        onBackToLanding={handleBackToLanding}
      />
    );
  }

  return (
    <main style={{ minHeight: '100vh', width: '100%', position: 'relative' }}>
      {/* Fixed Navbar with Brand Logo, Sign In, and Login buttons */}
      <Navbar
        onOpenSignIn={() => setIsLoginOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogoClick={() => {
          setIsPlansOpen(false);
          setIsBookingOpen(false);
          setActiveInfoSection(null);
          setIsLoginOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Hero Section */}
      <Hero
        onOpenPlans={() => setIsPlansOpen(true)}
        onOpenBooking={() => setIsBookingOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      {/* TrustedBy Section */}
      <TrustedBy />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
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
  );
}
