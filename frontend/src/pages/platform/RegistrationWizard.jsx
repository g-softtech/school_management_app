import React, { useState } from 'react';
import api from '../../services/api';

export default function RegistrationWizard() {
  const [formData, setFormData] = useState({
    schoolName: '',
    subdomain: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    planType: 'BASIC'
  });
  const [status, setStatus] = useState('idle'); // idle, submitting, success, error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      // Use standard generic API since public auth is available at /api/public/provision
      await api.post('/public/provision', formData);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Registration failed');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg text-center">
          <h2 className="text-3xl font-extrabold text-green-600">Request Received!</h2>
          <p className="text-gray-600">
            Your school infrastructure is being staged. We will notify you at <strong>{formData.adminEmail}</strong> once the platform administrator approves your environment.
          </p>
          <a href="/" className="mt-4 block text-blue-600 hover:underline">Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          Deploy Your School
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm">
                {errorMsg}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">School Name</label>
              <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                     value={formData.schoolName} onChange={e => setFormData({...formData, schoolName: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Subdomain</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input required type="text" className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md sm:text-sm border border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                       value={formData.subdomain} onChange={e => setFormData({...formData, subdomain: e.target.value})} />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                  .thecortexsystems.com
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Name</label>
                <input required type="text" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                       value={formData.adminName} onChange={e => setFormData({...formData, adminName: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Plan Tier</label>
                <select className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        value={formData.planType} onChange={e => setFormData({...formData, planType: e.target.value})}>
                  <option value="BASIC">Basic</option>
                  <option value="PREMIUM">Premium</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Admin Email</label>
              <input required type="email" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                     value={formData.adminEmail} onChange={e => setFormData({...formData, adminEmail: e.target.value})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Admin Password</label>
              <input required type="password" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                     value={formData.adminPassword} onChange={e => setFormData({...formData, adminPassword: e.target.value})} />
            </div>

            <button type="submit" disabled={status === 'submitting'} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
              {status === 'submitting' ? 'Submitting...' : 'Register School'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
