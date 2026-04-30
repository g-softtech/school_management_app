import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiBookOpen, FiChevronRight } from 'react-icons/fi';
import { APP_NAME, APP_TAGLINE } from '../../utils/constants';

const NAV_LINKS = [
  { to: '/',           label: 'Home'       },
  { to: '/about',      label: 'About Us'   },
  { to: '/academics',  label: 'Academics'  },
  { to: '/admissions', label: 'Admissions' },
  { to: '/gallery',    label: 'Gallery'    },
  { to: '/contact',    label: 'Contact'    },
];

function Navbar({ scrolled }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-secondary-900 shadow-xl' : 'bg-secondary-900/90 backdrop-blur-sm'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg group-hover:bg-primary-400 transition-colors">
              <FiBookOpen className="text-white text-lg" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-tight">{APP_NAME}</p>
              <p className="text-primary-400 text-[10px] leading-tight hidden sm:block">{APP_TAGLINE}</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-primary-400 bg-primary-500/10'
                      : 'text-secondary-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* CTA + hamburger */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-primary-500/30"
            >
              Portal Login <FiChevronRight size={15} />
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 text-secondary-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-secondary-700 py-3 space-y-1 pb-4">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive ? 'text-primary-400 bg-primary-500/10' : 'text-secondary-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <Link to="/login" className="block mt-2 mx-4 text-center bg-primary-500 hover:bg-primary-400 text-white text-sm font-semibold px-5 py-3 rounded-xl transition-colors">
              Portal Login
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-secondary-900 text-secondary-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
                <FiBookOpen className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">{APP_NAME}</span>
            </div>
            <p className="text-sm leading-relaxed mb-4">
              Empowering African students with world-class education management and digital learning tools.
            </p>
            <div className="flex gap-3">
              {['Facebook','Twitter','Instagram','LinkedIn'].map((s) => (
                <a key={s} href="#" className="w-8 h-8 bg-secondary-700 hover:bg-primary-500 rounded-lg flex items-center justify-center text-xs font-bold text-white transition-colors">
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Quick Links</p>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm hover:text-primary-400 transition-colors flex items-center gap-1.5">
                    <FiChevronRight size={13} className="text-primary-500" /> {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Portals */}
          <div>
            <p className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Portals</p>
            <ul className="space-y-2.5">
              {['Admin Portal','Teacher Portal','Student Portal','Parent Portal'].map((p) => (
                <li key={p}>
                  <Link to="/login" className="text-sm hover:text-primary-400 transition-colors flex items-center gap-1.5">
                    <FiChevronRight size={13} className="text-primary-500" /> {p}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Contact</p>
            <ul className="space-y-3 text-sm">
              <li>📍 123 Education Avenue, Lagos, Nigeria</li>
              <li>📞 +234 801 234 5678</li>
              <li>✉️ info@smartschool.edu.ng</li>
              <li>🕐 Mon – Fri: 8:00am – 4:00pm</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-700 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-primary-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary-400 transition-colors">Terms of Use</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function PublicLayout({ children }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar scrolled={scrolled} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
