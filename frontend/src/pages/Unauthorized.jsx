import { useNavigate } from 'react-router-dom';
import { FiShield, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const ROLE_ROUTES = {
  admin: '/admin', teacher: '/teacher', student: '/student', parent: '/parent',
};

export default function Unauthorized() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const home        = user ? ROLE_ROUTES[user.role] : '/login';

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <FiShield className="text-red-500 text-4xl" />
        </div>
        <h1 className="text-8xl font-bold text-secondary-100">403</h1>
        <h2 className="text-2xl font-semibold text-secondary-800 mt-2">Access denied</h2>
        <p className="text-secondary-500 mt-3 text-sm leading-relaxed">
          You do not have permission to view this page.
          {user && ` You are logged in as ${user.role}.`}
        </p>
        <div className="flex gap-3 justify-center mt-6">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <FiArrowLeft size={16} />
            Go back
          </button>
          <button onClick={() => navigate(home, { replace: true })} className="btn-primary">
            My dashboard
          </button>
        </div>
      </div>
    </div>
  );
}