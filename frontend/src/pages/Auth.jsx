import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast, ToastContainer } from '../components/Toast';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const { login, signup } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLogin) {
      // Login
      if (!email.trim() || !password) {
        toast.error('Please enter your email and password');
        return;
      }

      setLoading(true);
      try {
        const result = await login(email, password);
        if (result.success) {
          toast.success(`Welcome back, ${result.user.name}!`);
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
    } else {
      // Signup
      if (!email.trim() || !password || !name.trim()) {
        toast.error('Please fill in all fields');
        return;
      }

      if (password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        toast.error('Please enter a valid email address');
        return;
      }

      setLoading(true);
      try {
        // All new signups are automatically employees
        const result = await signup(email, password, name, 'employee');
        if (result.success) {
          toast.success(`Account created! Welcome, ${result.user.name}!`);
          if (onLogin) {
            onLogin(result.user, result.token);
          }
        }
      } catch (error) {
        console.error('Signup error:', error);
        toast.error(error.message || 'Signup failed. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <>
      <ToastContainer toasts={toast.toasts} removeToast={toast.removeToast} />
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </h1>
            <p className="text-gray-600">
              {isLogin ? 'Welcome back! Please sign in to continue' : 'Create a new account to get started'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                  minLength={2}
                  maxLength={50}
                  disabled={loading}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isLogin ? "Enter your password" : "Create a password (min. 6 characters)"}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                required
                minLength={6}
                disabled={loading}
              />
            </div>


            <button
              type="submit"
              disabled={loading || (isLogin ? !email.trim() || !password : !email.trim() || !password || !name.trim())}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Sign In' : 'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setName('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              disabled={loading}
            >
              {isLogin ? (
                <>Don't have an account? <span className="underline">Sign Up</span></>
              ) : (
                <>Already have an account? <span className="underline">Sign In</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
