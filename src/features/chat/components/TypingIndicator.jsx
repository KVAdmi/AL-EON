
import React from 'react';
import { motion } from 'framer-motion';

function TypingIndicator() {
  return (
    <div className="flex gap-4">
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          AL
        </span>
      </div>
      
      <div 
        className="inline-flex items-center gap-1 p-4 rounded-lg"
        style={{ backgroundColor: 'var(--color-bg-secondary)' }}
      >
        <span className="text-sm mr-2" style={{ color: 'var(--color-text-secondary)' }}>
          AL-E is typing
        </span>
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: 'var(--color-text-tertiary)' }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default TypingIndicator;
