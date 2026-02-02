import React, { useState } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, Mail, Lock, User, ArrowRight } from "lucide-react"
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars"
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
    <StarsBackground className="flex items-center justify-center p-4">
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
        <Card className="border-slate-200 bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border">
          <CardHeader className="space-y-1 pb-8 text-center bg-gradient-to-b from-slate-50 to-transparent">
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              {isLogin ? 'Enter your credentials to access your account' : 'Fill in the information below to register'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 p-8">
            <form onSubmit={handleSubmit} className="grid gap-6">
              {!isLogin && (
                <div className="grid gap-2">
                  <Label htmlFor="name" className="text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="name"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl focus:ring-blue-500/10"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl focus:ring-blue-500/10"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-slate-600 font-semibold uppercase tracking-wider text-[10px]">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-12 rounded-xl focus:ring-blue-500/10"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading || (isLogin ? !email.trim() || !password : !email.trim() || !password || !name.trim())}
                className="w-full bg-[#1a3e62] hover:bg-[#122c46] text-white h-14 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-95 group"
              >
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 p-8 pt-0">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-400 font-bold">Or continue with</span>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setName('');
              }}
              disabled={loading}
              className="w-full text-[#1a3e62] hover:text-[#122c46] hover:bg-slate-50 rounded-xl h-12 font-semibold"
            >
              {isLogin ? (
                "Don't have an account? Sign Up"
              ) : (
                "Already have an account? Sign In"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </StarsBackground>
  );
};

export default Auth;

