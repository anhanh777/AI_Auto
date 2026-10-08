import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { BusinessProvider } from './contexts/BusinessContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BusinessProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </BusinessProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
