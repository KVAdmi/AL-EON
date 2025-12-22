import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function Logo({ className = '' }) {
  const { theme } = useTheme();
  
  const logoSrc = theme === 'dark' 
    ? '/logo-dark.png' 
    : '/logo-light.png';
  
  return (
    <img 
      src={logoSrc} 
      alt="AL-EON" 
      className={`transition-opacity duration-300 ${className}`}
    />
  );
}
