import React from 'react';

export const CurvedLines: React.FC = () => {
  // 20 lines left and 20 lines right
  const linesCount = 20;

  return (
    <div className="curved-lines-wrap" aria-hidden="true">
      {/* 20 Left Curved Lines */}
      {Array.from({ length: linesCount }, (_, i) => {
        const width = 60 + i * 10;
        const delay = `${i * 0.25}s`;
        return (
          <div
            key={`left-${i}`}
            className="curved-line-left"
            style={{
              width: `${width}px`,
              animationDelay: delay,
            }}
          />
        );
      })}

      {/* 20 Right Curved Lines */}
      {Array.from({ length: linesCount }, (_, i) => {
        const width = 60 + i * 10;
        const delay = `${i * 0.25}s`;
        return (
          <div
            key={`right-${i}`}
            className="curved-line-right"
            style={{
              width: `${width}px`,
              animationDelay: delay,
            }}
          />
        );
      })}

      {/* Mobile Top Horizontal Curved Lines (<810px) */}
      {Array.from({ length: linesCount }, (_, i) => {
        const width = 160 + i * 15;
        const height = 30 + i * 10;
        const delay = `${i * 0.25}s`;
        return (
          <div
            key={`top-${i}`}
            className="curved-line-top"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              animationDelay: delay,
            }}
          />
        );
      })}
    </div>
  );
};
