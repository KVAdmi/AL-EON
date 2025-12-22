import React from 'react';

export default function MainLayout({ children }) {
  // Layout simplificado sin sidebar - el sidebar está ahora en ChatPage
  return (
    <div className="h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {children}
    </div>
  );
}
