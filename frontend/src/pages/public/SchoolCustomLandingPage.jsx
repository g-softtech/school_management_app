import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../utils/constants';

export default function SchoolCustomLandingPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // We send a request to /api/website/public which reads req.headers.host on the backend
    axios.get(`${API_URL}/website/public`)
      .then(res => {
        setConfig(res.data.data);
        
        // Dynamically inject the primary and secondary colors as CSS variables
        if (res.data.data.primaryColor) {
          document.documentElement.style.setProperty('--primary-color', res.data.data.primaryColor);
        }
        if (res.data.data.secondaryColor) {
          document.documentElement.style.setProperty('--secondary-color', res.data.data.secondaryColor);
        }
      })
      .catch(err => {
        setError(err.response?.data?.message || 'Failed to load website configuration.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color,blue)]"></div>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Website Not Found</h1>
        <p className="text-gray-600">{error || 'This custom domain is not mapped to any active school.'}</p>
        <a href="https://app.thecortexsystems.com" className="mt-6 text-blue-600 underline">Return to Platform</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900" style={{ '--theme-primary': config.primaryColor, '--theme-secondary': config.secondaryColor }}>
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 shadow-sm" style={{ backgroundColor: config.secondaryColor }}>
        <div className="flex items-center gap-3">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="School Logo" className="h-10" />
          ) : (
            <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">Logo</div>
          )}
          <span className="font-bold text-xl" style={{ color: config.primaryColor }}>{config.heroTitle || 'Our School'}</span>
        </div>
        <div className="flex gap-4">
          <a href="/login" className="px-5 py-2 rounded text-white font-medium hover:opacity-90 transition-opacity" style={{ backgroundColor: config.primaryColor }}>
            Portal Login
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-32 px-6 text-center" style={{ backgroundColor: config.primaryColor, color: config.secondaryColor }}>
        <div className="absolute inset-0 opacity-10 bg-black"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-5xl font-extrabold mb-6 leading-tight">{config.heroTitle || 'Welcome to Our School'}</h1>
          <p className="text-xl mb-10 opacity-90">{config.heroSubtitle || 'Empowering the next generation of leaders.'}</p>
          <a href="#about" className="px-8 py-3 rounded-full text-lg font-bold bg-white transition-transform hover:scale-105" style={{ color: config.primaryColor }}>
            Learn More
          </a>
        </div>
      </header>

      {/* About Section */}
      <section id="about" className="py-20 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-8" style={{ color: config.primaryColor }}>About Us</h2>
        <p className="text-lg text-gray-700 leading-relaxed">
          {config.aboutText || 'We are dedicated to providing excellent education in a supportive and challenging environment.'}
        </p>
      </section>

      {/* Gallery Section */}
      {config.gallery && config.gallery.length > 0 && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-10 text-center" style={{ color: config.primaryColor }}>Gallery</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {config.gallery.map((img, i) => (
                <div key={i} className="aspect-video bg-gray-200 rounded-lg overflow-hidden shadow-md">
                  <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-12 px-6 text-center" style={{ backgroundColor: config.secondaryColor, borderTop: `4px solid ${config.primaryColor}` }}>
        <h3 className="font-bold text-xl mb-4" style={{ color: config.primaryColor }}>Contact Us</h3>
        <p className="text-gray-700 mb-2">Email: {config.contactEmail || 'info@school.com'}</p>
        <p className="text-gray-700 mb-2">Phone: {config.contactPhone || '+1234567890'}</p>
        <p className="text-gray-700 mt-6 opacity-70">© {new Date().getFullYear()} {config.heroTitle || 'Our School'}. All rights reserved.</p>
      </footer>
    </div>
  );
}
