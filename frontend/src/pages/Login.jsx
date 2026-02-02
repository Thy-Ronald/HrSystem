import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, User, ShieldCheck, ArrowRight, Monitor } from "lucide-react"
import { StarsBackground } from "@/components/animate-ui/components/backgrounds/stars"

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
    <StarsBackground className="flex items-center justify-center p-4">
      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-500">
        <Card className="border-slate-200 bg-white/90 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden border">
          <CardHeader className="space-y-1 pb-6 text-center bg-gradient-to-b from-slate-50 to-transparent">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <Monitor className="h-8 w-8 text-[#1a3e62]" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
              Remote Support
            </CardTitle>
            <CardDescription className="text-slate-500 font-medium">
              Select your role and enter your name to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <Label className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] block text-center">
                  Select Your Role
                </Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setRole('employee')}
                    className={`p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 group relative overflow-hidden ${role === 'employee'
                      ? 'border-[#1a3e62] bg-slate-50 text-[#1a3e62] shadow-md'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:text-slate-600'
                      }`}
                  >
                    <div className={`p-3 rounded-xl transition-all duration-300 ${role === 'employee' ? 'bg-[#1a3e62] text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
                      }`}>
                      <User className="w-6 h-6" />
                    </div>
                    <span className="font-bold tracking-tight">Employee</span>
                    {role === 'employee' && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-3 group relative overflow-hidden ${role === 'admin'
                      ? 'border-[#1a3e62] bg-slate-50 text-[#1a3e62] shadow-md'
                      : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200 hover:text-slate-600'
                      }`}
                  >
                    <div className={`p-3 rounded-xl transition-all duration-300 ${role === 'admin' ? 'bg-[#1a3e62] text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'
                      }`}>
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <span className="font-bold tracking-tight">Admin</span>
                    {role === 'admin' && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <Label htmlFor="name" className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] block text-center">
                  Your Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-14 rounded-2xl focus:ring-blue-500/10 text-center font-medium"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !role || !name.trim()}
                className="w-full bg-[#1a3e62] hover:bg-[#122c46] text-white h-16 rounded-2xl font-bold text-lg transition-all shadow-lg active:scale-95 group"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-8 text-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] leading-relaxed">
                Secure Monitoring System
                <span className="block mt-1 font-medium lowercase text-slate-500 tracking-normal opacity-70 italic">All sessions are recorded for security.</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </StarsBackground>
  );
};

export default Login;
