import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiArrowLeft, FiBookOpen, FiCheckCircle } from 'react-icons/fi';
import { forgotPassword } from '../services/authService';
import { getErrorMessage } from '../utils/helpers';
import { APP_NAME } from '../utils/constants';

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [devUrl, setDevUrl]     = useState('');   // only shown in dev mode

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Please enter your email address'); return; }
    setLoading(true);
    try {
      const res = await forgotPassword({ email: email.trim() });
      setSubmitted(true);
      // Dev mode: backend returns resetUrl directly
      if (res.data.resetUrl) setDevUrl(res.data.resetUrl);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg">
            <FiBookOpen className="text-white text-xl" />
          </div>
          <span className="text-secondary-800 text-2xl font-bold">{APP_NAME}</span>
        </div>

        <div className="card space-y-6">
          {submitted ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <FiCheckCircle className="text-green-600" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-secondary-800">Check Your Email</h2>
                <p className="text-secondary-500 text-sm mt-2 leading-relaxed">
                  If an account exists for <strong>{email}</strong>, we've sent a password reset link.
                  Check your inbox and spam folder.
                </p>
              </div>

              {/* Dev mode helper */}
              {devUrl && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
                  <p className="text-xs font-bold text-amber-700 mb-1">🛠 Dev Mode — Reset Link:</p>
                  <Link
                    to={devUrl.replace(window.location.origin, '')}
                    className="text-xs text-blue-600 hover:underline break-all"
                  >
                    {devUrl}
                  </Link>
                  <p className="text-xs text-amber-600 mt-2">This link is only shown in development mode. In production, it will be emailed.</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => { setSubmitted(false); setDevUrl(''); setEmail(''); }}
                  className="btn-secondary w-full text-sm"
                >
                  Try a different email
                </button>
                <Link to="/login" className="btn-primary w-full text-sm text-center">
                  Back to Login
                </Link>
              </div>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div>
                <h2 className="text-xl font-bold text-secondary-800">Forgot Password?</h2>
                <p className="text-secondary-500 text-sm mt-1 leading-relaxed">
                  No worries. Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="input-label">Email address</label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@smartschool.com"
                      className="input-field pl-10"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Sending reset link…
                    </span>
                  ) : 'Send Reset Link'}
                </button>
              </form>

              <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-secondary-500 hover:text-secondary-700 transition-colors">
                <FiArrowLeft size={14} /> Back to Login
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-xs text-secondary-400 mt-6">
          © {new Date().getFullYear()} {APP_NAME} · All rights reserved
        </p>
      </div>
    </div>
  );
}
