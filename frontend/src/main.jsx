import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './index.css';
import { AuthProvider }         from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { FeatureFlagProvider }  from './context/FeatureFlagContext';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FeatureFlagProvider>
          <NotificationProvider>
            <App />
            <ToastContainer
              position="top-right"
              autoClose={3500}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnHover
              draggable
              theme="light"
            />
          </NotificationProvider>
        </FeatureFlagProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
