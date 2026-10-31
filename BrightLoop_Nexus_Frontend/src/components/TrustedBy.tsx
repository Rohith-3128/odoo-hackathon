import React from 'react';

interface CompanyLogo {
  name: string;
  className: string;
}

const COMPANIES: CompanyLogo[] = [
  { name: 'airbnb', className: 'company-logo logo-airbnb' },
  { name: 'shopify', className: 'company-logo logo-shopify' },
  { name: 'Notion', className: 'company-logo logo-notion' },
  { name: 'Linear', className: 'company-logo logo-linear' },
  { name: 'webflow', className: 'company-logo logo-webflow' },
  { name: 'Figma', className: 'company-logo logo-figma' },
  { name: 'Slack', className: 'company-logo logo-slack' },
  { name: 'stripe', className: 'company-logo logo-stripe' },
  { name: '▲ Vercel', className: 'company-logo logo-vercel' },
  { name: 'Framer', className: 'company-logo logo-framer' },
];

export const TrustedBy: React.FC = () => {
  // Duplicate for seamless infinite marquee loop
  const duplicatedLogos = [...COMPANIES, ...COMPANIES];

  return (
    <section className="trusted-section" aria-label="Trusted companies">
      <p className="trusted-label">
        Partnered with top-tier companies globally
      </p>

      <div className="trusted-marquee-wrapper">
        <div className="trusted-marquee-track">
          {duplicatedLogos.map((item, idx) => (
            <span key={`${item.name}-${idx}`} className={item.className}>
              {item.name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
