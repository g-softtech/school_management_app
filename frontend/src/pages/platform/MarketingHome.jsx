import React from 'react';

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-gray-900 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">The Cortex Systems</h1>
          <nav>
            <a href="/register" className="px-4 py-2 bg-blue-600 rounded text-white font-medium hover:bg-blue-700">
              Start Your School
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-extrabold text-gray-900 tracking-tight">
          The Future of School Management
        </h2>
        <p className="mt-4 text-xl text-gray-500 max-w-3xl mx-auto">
          Deploy your own white-labeled school management infrastructure in seconds. Isolated databases, custom domains, and dynamic feature scaling.
        </p>
        <div className="mt-10">
          <a href="/register" className="px-8 py-3 bg-blue-600 rounded text-white text-lg font-medium hover:bg-blue-700">
            Deploy Now
          </a>
        </div>
      </main>
    </div>
  );
}
