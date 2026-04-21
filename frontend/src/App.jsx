import { Routes, Route, Navigate } from 'react-router-dom';

// Placeholder pages — replaced in each phase
const ComingSoon = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center bg-surface">
    <div className="text-center">
      <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">🏫</span>
      </div>
      <h1 className="text-2xl font-semibold text-secondary-800">{title}</h1>
      <p className="text-secondary-500 mt-2">This page will be built in the next phase.</p>
      <p className="text-xs text-secondary-400 mt-4">SmartSchool — Phase 1 complete</p>
    </div>
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/"       element={<Navigate to="/login" replace />} />
      <Route path="/login"  element={<ComingSoon title="Login — Phase 2" />} />
      <Route path="/admin"  element={<ComingSoon title="Admin Dashboard — Phase 5" />} />
      <Route path="/teacher"element={<ComingSoon title="Teacher Dashboard — Phase 6" />} />
      <Route path="/student"element={<ComingSoon title="Student Dashboard — Phase 7" />} />
      <Route path="/parent" element={<ComingSoon title="Parent Dashboard — Phase 8" />} />
      <Route path="*"       element={<ComingSoon title="404 — Page Not Found" />} />
    </Routes>
  );
}