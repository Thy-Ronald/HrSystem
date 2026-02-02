import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

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
            <h1 className="text-3xl font-bold text-gray-800 mb-2 tracking-tight">Remote Support</h1>
            <p className="text-slate-500 font-medium">Sign in to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('employee')}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 group ${role === 'employee'
                    ? 'border-[#1a3e62] bg-slate-50 text-[#1a3e62] ring-4 ring-[#1a3e62]/10'
                    : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm'
                    }`}
                >
                  <div className={`p-3 rounded-full transition-colors ${role === 'employee' ? 'bg-[#1a3e62] text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="font-bold">Employee</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 group ${role === 'admin'
                    ? 'border-[#1a3e62] bg-slate-50 text-[#1a3e62] ring-4 ring-[#1a3e62]/10'
                    : 'border-slate-100 bg-white hover:border-slate-200 text-slate-500 hover:text-slate-700 shadow-sm'
                    }`}
                >
                  <div className={`p-3 rounded-full transition-colors ${role === 'admin' ? 'bg-[#1a3e62] text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="font-bold">Admin</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-semibold text-slate-700 uppercase tracking-wider">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#1a3e62]/10 focus:border-[#1a3e62] outline-none transition-all placeholder:text-slate-400 bg-white font-medium"
                required
                minLength={2}
                maxLength={50}
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !role || !name.trim()}
              className="w-full bg-[#1a3e62] hover:bg-[#122c46] text-white py-6 rounded-xl font-bold transition-all shadow-md active:scale-[0.98] text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Select your role and enter your name to access the monitoring system.
              <br />All sessions are recorded for security.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
