import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiEye, FiEyeOff, FiBookOpen, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/authService';
import { getErrorMessage } from '../utils/helpers';
import { APP_NAME, APP_TAGLINE } from '../utils/constants';

const ROLE_ROUTES = {
  admin:   '/admin',
  teacher: '/teacher',
  student: '/student',
  parent:  '/parent',
};

const DEMO_ACCOUNTS = [
  { label: 'Admin',   email: 'admin@smartschool.com',   password: 'Admin1234!',   color: 'bg-purple-100 text-purple-700' },
  { label: 'Teacher', email: 'teacher1@smartschool.com', password: 'Teacher1234!', color: 'bg-blue-100 text-blue-700' },
  { label: 'Student', email: 'emeka@smartschool.com',    password: 'Student1234!', color: 'bg-green-100 text-green-700' },
  { label: 'Parent',  email: 'parent1@smartschool.com',  password: 'Parent1234!',  color: 'bg-orange-100 text-orange-700' },
];

export default function Login() {
  const { login }   = useAuth();
  const navigate    = useNavigate();
  const [form, setForm]           = useState({ email: '', password: '' });
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error('Please enter email and password'); return; }
    setLoading(true);
    try {
      const res = await loginUser(form);
      const { accessToken, user } = res.data;
      login(accessToken, user);
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(ROLE_ROUTES[user.role] || '/login', { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setForm({ email: account.email, password: account.password });
  };

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — branding ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-secondary-800 flex-col justify-between p-12 relative overflow-hidden">

        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary-500 opacity-10" />
        <div className="absolute -bottom-32 -right-16 w-96 h-96 rounded-full bg-primary-500 opacity-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary-500 opacity-5" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <FiBookOpen className="text-white text-xl" />
            </div>
            <span className="text-white text-2xl font-bold">{APP_NAME}</span>
          </div>
          <p className="text-primary-300 text-sm">{APP_TAGLINE}</p>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-white text-4xl font-bold leading-tight">
              Shaping the Future<br />
              <span className="text-primary-400">One Student at a Time</span>
            </h2>
            <p className="text-secondary-300 mt-4 text-base leading-relaxed">
              A modern school management platform built for African schools —
              connecting teachers, students, and parents in one place.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: '📊', text: 'Real-time academic analytics' },
              { icon: '📚', text: 'Digital lesson notes & assignments' },
              { icon: '💳', text: 'Seamless fee payments via Paystack' },
              { icon: '🤖', text: 'AI-powered lesson generation' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-lg">{f.icon}</span>
                <span className="text-secondary-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { value: '500+', label: 'Students' },
            { value: '50+',  label: 'Teachers' },
            { value: '99%',  label: 'Uptime' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-primary-400 text-2xl font-bold">{s.value}</p>
              <p className="text-secondary-400 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-surface">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <FiBookOpen className="text-white text-xl" />
            </div>
            <span className="text-secondary-800 text-2xl font-bold">{APP_NAME}</span>
          </div>

          <div className="card-md">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-secondary-800">Welcome back</h1>
              <p className="text-secondary-500 text-sm mt-1">Sign in to your school portal</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="input-label">Email address</label>
                <div className="relative">
                  <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 text-sm" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@smartschool.com"
                    className="input-field pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="input-label">Password</label>
                <div className="relative">
                  <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400 text-sm" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="input-field pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                  >
                    {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              {/* Forgot password */}
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 text-base"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6">
              <p className="text-xs text-secondary-400 text-center mb-3">— Quick access for testing —</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => fillDemo(a)}
                    className={`text-xs font-medium px-3 py-2 rounded-lg transition-all hover:opacity-80 ${a.color}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-secondary-400 text-center mt-2">
                Click a role above to auto-fill credentials
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 mt-6">
            <Link to="/" className="flex items-center gap-1.5 text-xs text-secondary-400 hover:text-primary-500 transition-colors">
              <FiArrowLeft size={12} /> Back to school website
            </Link>
            <p className="text-xs text-secondary-400">
              © {new Date().getFullYear()} {APP_NAME} · Built for African Schools
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}