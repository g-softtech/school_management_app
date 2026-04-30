import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiLock, FiEye, FiEyeOff, FiBookOpen, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { resetPassword } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/helpers';
import { APP_NAME } from '../utils/constants';

const ROLE_ROUTES = {
  admin: '/admin', teacher: '/teacher', student: '/student', parent: '/parent',
};

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Contains a number',     pass: /\d/.test(password) },
    { label: 'Contains uppercase',    pass: /[A-Z]/.test(password) },
    { label: 'Contains lowercase',    pass: /[a-z]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ['bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-500'];
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < score ? colors[score] : 'bg-secondary-200'}`} />
        ))}
      </div>
      <p className={`text-xs font-medium ${score >= 3 ? 'text-green-600' : score >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
        {labels[score]}
      </p>
      <ul className="space-y-1">
        {checks.map((c) => (
          <li key={c.label} className={`flex items-center gap-1.5 text-xs ${c.pass ? 'text-green-600' : 'text-secondary-400'}`}>
            {c.pass
              ? <FiCheckCircle size={11} />
              : <FiAlertCircle size={11} />
            }
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ResetPassword() {
  const { token }     = useParams();
  const navigate      = useNavigate();
  const { login }     = useAuth();

  const [form, setForm]         = useState({ password: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }

    setLoading(true);
    try {
      const res = await resetPassword(token, { password: form.password });
      const { accessToken, user } = res.data;

      if (accessToken && user) {
        login(accessToken, user);
        toast.success('Password reset! Welcome back.');
        setSuccess(true);
        setTimeout(() => navigate(ROLE_ROUTES[user.role] || '/login', { replace: true }), 2000);
      } else {
        setSuccess(true);
        toast.success('Password reset successfully. Please log in.');
      }
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
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <FiCheckCircle className="text-green-600" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-secondary-800">Password Reset!</h2>
                <p className="text-secondary-500 text-sm mt-2">
                  Your password has been updated. Redirecting you to your dashboard…
                </p>
              </div>
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              <div>
                <h2 className="text-xl font-bold text-secondary-800">Set New Password</h2>
                <p className="text-secondary-500 text-sm mt-1">
                  Choose a strong password for your account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="input-label">New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Min. 8 characters"
                      className="input-field pl-10 pr-10"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                    >
                      {showPass ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                    </button>
                  </div>
                  <PasswordStrength password={form.password} />
                </div>

                <div>
                  <label className="input-label">Confirm New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary-400" size={15} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.confirm}
                      onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                      placeholder="Re-enter your password"
                      className="input-field pl-10"
                      required
                    />
                  </div>
                  {form.confirm && form.password !== form.confirm && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      <FiAlertCircle size={11} /> Passwords do not match
                    </p>
                  )}
                  {form.confirm && form.password === form.confirm && form.confirm.length >= 8 && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <FiCheckCircle size={11} /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || form.password !== form.confirm || form.password.length < 8}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Resetting password…
                    </span>
                  ) : 'Reset Password'}
                </button>
              </form>

              <Link to="/login" className="flex items-center justify-center gap-1 text-sm text-secondary-500 hover:text-secondary-700 transition-colors">
                Back to Login
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
