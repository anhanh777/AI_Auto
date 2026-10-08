import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ThemeProvider } from './contexts/ThemeContext.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';
import { ToastProvider } from './contexts/ToastContext.jsx';
import { BusinessProvider } from './contexts/BusinessContext.jsx';
import AppRoutes from './routes/AppRoutes.jsx';

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <BusinessProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </BusinessProvider>
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
