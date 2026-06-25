import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function PlatformDashboard() {
  const [requests, setRequests] = useState([]);
  const [analytics, setAnalytics] = useState({ totalSchools: 0, mrr: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, statRes] = await Promise.all([
        api.get('/platform/requests'),
        api.get('/platform/analytics')
      ]);
      setRequests(reqRes.data.data);
      setAnalytics(statRes.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load platform data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await api.post(`/platform/requests/${requestId}/approve`);
      alert('Tenant Approved! Simulated activation email dispatched.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    try {
      await api.post(`/platform/requests/${requestId}/reject`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed');
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading Control Plane...</div>;
  if (error) return <div className="p-10 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Control Plane</h1>
            <p className="text-gray-500">Global SaaS Management Dashboard</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/platform/login';
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Active Schools</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalSchools}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Pending Requests</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{analytics.totalPendingRequests}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500">Estimated MRR</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">${analytics.mrr.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Tenant Onboarding Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">School</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Plan</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map(req => (
                  <tr key={req.id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{req.schoolName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{req.subdomain}.thecortexsystems.com</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {req.adminName}<br/>
                      <span className="text-xs text-gray-400">{req.adminEmail}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                        {req.planType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        req.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {req.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      {req.status === 'pending' && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleApprove(req.id)}
                            className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded shadow-sm text-xs"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => handleReject(req.id)}
                            className="text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded shadow-sm text-xs"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      No onboarding requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
