import React from 'react';

interface DrawerOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: 'projects' | 'plans' | 'team' | 'faqs' | 'contact' | 'nexus') => void;
}

export const DrawerOverlay: React.FC<DrawerOverlayProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const links: Array<{
    id: 'projects' | 'plans' | 'team' | 'faqs' | 'contact' | 'nexus';
    label: string;
  }> = [
    { id: 'projects', label: 'Projects' },
    { id: 'plans', label: 'Plans' },
    { id: 'team', label: 'Team' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'contact', label: 'Get in Touch' },
    { id: 'nexus', label: 'Nexus OS' },
  ];

  const handleLinkClick = (id: 'projects' | 'plans' | 'team' | 'faqs' | 'contact' | 'nexus') => {
    onClose();
    onNavigate(id);
  };

  return (
    <div
      className={`drawer-overlay ${isOpen ? 'open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      aria-label="Navigation drawer"
    >
      <div className="drawer-content">
        {links.map((link) => (
          <button
            key={link.id}
            type="button"
            className="drawer-link"
            onClick={() => handleLinkClick(link.id)}
          >
            {link.label}
          </button>
        ))}
      </div>

      <footer className="drawer-footer">
        <span>© {new Date().getFullYear()} Alwayzz Agency Inc. All rights reserved.</span>
        <span>Crafted with obsessive precision.</span>
      </footer>
    </div>
  );
};
