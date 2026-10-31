import React from 'react';

const TICKER_ITEMS = [
  'Brand Identity',
  'App Development',
  'Visual Design',
  'Creative Video',
  'Iconography',
];

export const Ticker: React.FC = () => {
  // 4x duplicated sets for seamless loop
  const quadrupledItems = [
    ...TICKER_ITEMS,
    ...TICKER_ITEMS,
    ...TICKER_ITEMS,
    ...TICKER_ITEMS,
  ];

  return (
    <div className="ticker-row" aria-label="Capabilities ticker">
      <div className="ticker-track">
        {quadrupledItems.map((item, index) => (
          <span key={`ticker-${index}`} className="ticker-item">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};
