import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';


const Login = ({ onLogin }) => {
  const [role, setRole] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!role || !name.trim()) {
      toast.error('Please select a role and enter your name');
      return;
    }

    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters long');
      return;
    }

    setLoading(true);

    try {
      const result = await login(role, name);

      if (result.success) {
        toast.success(`Welcome, ${result.user.name}!`);

        // Notify parent component if callback provided
        if (onLogin) {
          onLogin(result.user, result.token);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Remote Support</h1>
            <p className="text-gray-600">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('employee')}
                  className={`p-4 rounded-lg border-2 transition-all ${role === 'employee'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-medium">Employee</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`p-4 rounded-lg border-2 transition-all ${role === 'admin'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span className="font-medium">Admin</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
                minLength={2}
                maxLength={50}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !role || !name.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Select your role and enter your name to access the monitoring system
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
