import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  CircularProgress,
  Container
} from '@mui/material';
import { Button } from "@/components/ui/button"
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

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
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#f5f7f9',
      p: 2
    }}>

      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a2027', mb: 1 }}>
                {isLogin ? 'Sign In' : 'Sign Up'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isLogin ? 'Welcome back! Please sign in to continue' : 'Create a new account to get started'}
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {!isLogin && (
                  <TextField
                    label="Full Name"
                    variant="outlined"
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={loading}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                )}

                <TextField
                  label="Email"
                  type="email"
                  variant="outlined"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />

                <TextField
                  label="Password"
                  type="password"
                  variant="outlined"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Enter your password" : "Min. 6 characters"}
                  required
                  disabled={loading}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />

                <Button
                  type="submit"
                  disabled={loading || (isLogin ? !email.trim() || !password : !email.trim() || !password || !name.trim())}
                  className="w-full bg-[#1a3e62] hover:bg-[#122c46] text-white py-6 rounded-xl font-semibold text-base transition-all shadow-md active:scale-[0.98]"
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: 'white' }} />
                  ) : (
                    isLogin ? 'Sign In' : 'Sign Up'
                  )}
                </Button>
              </Box>
            </form>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
              <Button
                variant="link"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail('');
                  setPassword('');
                  setName('');
                }}
                disabled={loading}
                className="text-[#1a3e62] hover:text-[#122c46] font-semibold"
              >
                {isLogin ? (
                  <>Don't have an account? Sign Up</>
                ) : (
                  <>Already have an account? Sign In</>
                )}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Auth;

