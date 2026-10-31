import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { DrawerOverlay } from './components/DrawerOverlay';
import { Hero } from './components/Hero';
import { TrustedBy } from './components/TrustedBy';
import { PlansModal } from './components/PlansModal';
import { BookingModal } from './components/BookingModal';
import { InfoModals } from './components/InfoModals';
import { NexusWorkspace } from './components/nexus/NexusWorkspace';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'nexus'>('landing');

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPlansOpen, setIsPlansOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [activeInfoSection, setActiveInfoSection] = useState<
    'projects' | 'team' | 'faqs' | 'contact' | null
  >(null);

  const handleToggleDrawer = () => {
    setIsDrawerOpen((prev) => !prev);
  };

  const handleNavigateSection = (
    section: 'projects' | 'plans' | 'team' | 'faqs' | 'contact' | 'nexus'
  ) => {
    if (section === 'plans') {
      setIsPlansOpen(true);
    } else if (section === 'nexus') {
      setCurrentView('nexus');
    } else {
      setActiveInfoSection(section);
    }
  };

  const handleSelectPlan = (planName: string) => {
    setIsPlansOpen(false);
    setIsBookingOpen(true);
  };

  if (currentView === 'nexus') {
    return <NexusWorkspace onBackToLanding={() => setCurrentView('landing')} />;
  }

  return (
    <main style={{ minHeight: '100vh', width: '100%', position: 'relative' }}>
      {/* Fixed Navbar */}
      <Navbar
        isDrawerOpen={isDrawerOpen}
        onToggleDrawer={handleToggleDrawer}
        onToggleWorkspace={() => setCurrentView('nexus')}
        onLogoClick={() => {
          setIsDrawerOpen(false);
          setIsPlansOpen(false);
          setIsBookingOpen(false);
          setActiveInfoSection(null);
          setCurrentView('landing');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Full-screen Drawer Overlay */}
      <DrawerOverlay
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNavigate={handleNavigateSection}
      />

      {/* Hero Section */}
      <Hero
        onOpenPlans={() => setIsPlansOpen(true)}
        onOpenBooking={() => setIsBookingOpen(true)}
      />

      {/* TrustedBy Section */}
      <TrustedBy />

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
