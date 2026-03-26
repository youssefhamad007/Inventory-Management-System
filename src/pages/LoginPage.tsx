import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Box, Loader2, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in → redirect to dashboard
  if (!loading && user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: loginError } = await login(email, password);
    if (loginError) {
      setError(loginError);
      setSubmitting(false);
    }
    // On success, onAuthStateChange fires and user is set → Navigate kicks in
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8 space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center shadow-[0_0_20px_rgba(0,184,217,0.5)]">
            <Box className="h-6 w-6 text-white" />
          </div>
          <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-emerald-400">
            Nexus IMS
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <h2 className="text-xl font-semibold text-center mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Sign in to your inventory dashboard
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ims-project.com"
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="flex h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded-lg bg-gradient-to-r from-primary to-emerald-500 text-white font-medium text-sm transition-all hover:shadow-[0_0_20px_rgba(0,184,217,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Inventory Management System v1.0
        </p>
      </div>
    </div>
  );
}
