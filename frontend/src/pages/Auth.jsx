import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, Mail, Lock, User, ArrowRight, Eye, EyeOff, Clock } from "lucide-react"
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars"
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

import logo from '../assets/logo.png';

const Auth = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rateLimitUntil, setRateLimitUntil] = useState(null); // ms timestamp when rate limit resets
  const [countdown, setCountdown] = useState(0); // seconds remaining
  const countdownRef = useRef(null);
  const toast = useToast();
  const { login, signup, loginWithToken } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      toast.error(error);
    }
  }, []);

  // Tick the rate-limit countdown every second
  useEffect(() => {
    if (!rateLimitUntil) return;

    const tick = () => {
      const remaining = Math.ceil((rateLimitUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setCountdown(0);
        setRateLimitUntil(null);
        clearInterval(countdownRef.current);
      } else {
        setCountdown(remaining);
      }
    };

    tick(); // run immediately
    countdownRef.current = setInterval(tick, 1000);
    return () => clearInterval(countdownRef.current);
  }, [rateLimitUntil]);

  const handleGithubLogin = () => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
    window.location.href = `${API_BASE}/api/auth/github`;
  };

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
        if (error.isRateLimited && error.retryAfter) {
          setRateLimitUntil(error.retryAfter);
        } else {
          toast.error(error.message || 'Login failed. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // Signup
      if (!email.trim() || !password || !name.trim() || !confirmPassword) {
        toast.error('Please fill in all fields');
        return;
      }

      if (password !== confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      if (!termsAccepted) {
        toast.error('You must agree to the Terms & Conditions');
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
        <Card className="border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border">
          <CardHeader className="space-y-1 pb-4 text-center bg-gradient-to-b from-slate-50 dark:from-slate-900 to-transparent pt-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img src={logo} alt="Logo" className="h-8 w-auto" />
              <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {isLogin ? 'Sign In' : 'Sign Up'}
              </CardTitle>
            </div>
            <CardDescription className="text-slate-500 dark:text-slate-400 font-medium text-xs">
              {isLogin ? 'Enter your credentials to access your account' : 'Fill in the information below to register'}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-6">
            <form onSubmit={handleSubmit} className="grid gap-4">
              {!isLogin && (
                <div className="grid gap-1.5">
                  <Label htmlFor="name" className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="name"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 h-10 rounded-lg focus:ring-blue-500/10 text-sm"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="email" className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 h-10 rounded-lg focus:ring-blue-500/10 text-sm"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="password" className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 h-10 rounded-lg focus:ring-blue-500/10 text-sm"
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10 text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              {!isLogin && (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor="confirmPassword" className="text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9 pr-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 h-10 rounded-lg focus:ring-blue-500/10 text-sm"
                        disabled={loading}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-10 w-10 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={setTermsAccepted}
                      className="border-slate-300 data-[state=checked]:bg-[#1a3e62] data-[state=checked]:border-[#1a3e62]"
                    />
                    <label
                      htmlFor="terms"
                      className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I agree to the <span onClick={() => setShowTermsDialog(true)} className="text-[#1a3e62] dark:text-blue-400 underline cursor-pointer hover:text-[#122c46] dark:hover:text-blue-300">Terms & Conditions</span>
                    </label>
                  </div>
                </>
              )}
              {/* Rate limit countdown banner */}
              {rateLimitUntil && countdown > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Too many attempts. Try again in{' '}
                    <span className="font-bold tabular-nums">
                      {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                    </span>
                  </span>
                </div>
              )}
              <Button
                type="submit"
                disabled={loading || !!rateLimitUntil || (isLogin ? !email.trim() || !password : !email.trim() || !password || !name.trim() || !termsAccepted || password !== confirmPassword)}
                className="w-full bg-[#1a3e62] hover:bg-[#122c46] text-white h-11 rounded-xl font-bold text-base transition-all shadow-md active:scale-95 group mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : rateLimitUntil && countdown > 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="tabular-nums">
                      {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
                    </span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 p-6 pt-0">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white dark:bg-slate-950 px-2 text-slate-400 dark:text-slate-500 font-bold">Or continue with</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Button
                variant="outline"
                onClick={handleGithubLogin}
                className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl h-11 font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span>Continue with GitHub</span>
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail('');
                setPassword('');
                setName('');
                setConfirmPassword('');
                setTermsAccepted(false);
              }}
              disabled={loading}
              className="w-full text-[#1a3e62] dark:text-blue-400 hover:text-[#122c46] dark:hover:text-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg h-10 font-semibold text-sm"
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

      <Dialog open={showTermsDialog} onOpenChange={setShowTermsDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Terms & Conditions</DialogTitle>
            <DialogDescription>
              Please read our terms and conditions carefully.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-slate-600 space-y-4">
            <p>1. <strong>Introduction</strong>: Welcome to our HR System. By creating an account, you agree to these terms.</p>
            <p>2. <strong>User Responsibilities</strong>: You are responsible for maintaining the confidentiality of your account credentials.</p>
            <p>3. <strong>Privacy</strong>: Your data is handled according to our Privacy Policy.</p>
            <p>4. <strong>Usage</strong>: This system is for authorized personnel management only.</p>
            {/* Add more filler text or real terms here */}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowTermsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </StarsBackground>
  );
};

export default Auth;

