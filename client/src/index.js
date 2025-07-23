import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import "./assets/css/style.css";
import "./assets/css/responsive.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "@fortawesome/fontawesome-free/css/all.min.css";

import { ProfileProvider } from './context/ProfileContext';
import { AuthProvider } from './context/AuthContext'; // ✅ Import AuthProvider

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider> {/* ✅ Wrap with AuthProvider first */}
      <ProfileProvider> {/* ✅ Then wrap with ProfileProvider */}
        <App />
      </ProfileProvider>
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();
