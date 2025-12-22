import React from 'react';
import { motion } from 'framer-motion';
import { AL_EON_IDENTITY } from '@/config/identity';

const WelcomeMessage = () => {
  return (
    <div className='w-full space-y-3'>
      <motion.h2
        className='text-xl font-semibold text-white'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        Bienvenido a {AL_EON_IDENTITY.name}
      </motion.h2>
      
      <motion.p
        className='text-sm text-gray-300 leading-5'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        Tu plataforma de inteligencia artificial privada y evolutiva.
      </motion.p>
      
      <motion.p
        className='text-xs text-gray-400 leading-5'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
      >
        Creado por{' '}
        <a 
          href={AL_EON_IDENTITY.creator.website}
          target="_blank"
          rel="noopener noreferrer"
          className='text-blue-400 hover:text-blue-300 underline'
        >
          {AL_EON_IDENTITY.creator.company}
        </a>
        {' '}• {AL_EON_IDENTITY.yearCreated}
      </motion.p>
    </div>
  );
};

export default WelcomeMessage;
