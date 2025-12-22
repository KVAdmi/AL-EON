
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from '@/App';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/styles/tokens.css';
import '@/styles/globals.css';
import { Toaster } from '@/ui/toaster';

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <ThemeProvider>
      <Router>
        <App />
        <Toaster />
      </Router>
    </ThemeProvider>
  </>
);
