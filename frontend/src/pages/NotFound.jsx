import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiBookOpen } from 'react-icons/fi';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <FiBookOpen className="text-primary-500 text-4xl" />
        </div>
        <h1 className="text-8xl font-bold text-secondary-100">404</h1>
        <h2 className="text-2xl font-semibold text-secondary-800 mt-2">Page not found</h2>
        <p className="text-secondary-500 mt-3 text-sm leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="btn-primary mt-6"
        >
          <FiArrowLeft size={16} />
          Go back
        </button>
      </div>
    </div>
  );
}