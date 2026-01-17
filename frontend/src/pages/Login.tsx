import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, Lock, User } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await login(username, password);
            // Redirect to dashboard on success
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Invalid credentials. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black relative overflow-hidden">
            {/* Subtle Background Pattern Overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoMnYtMmgtMnptMC00aDJ2Mmgtdi0yem0wIDhoMnYyaC0ydi0yem0wIDRoMnYyaC0ydi0yem0wLTEwaDF2NGgtMXYtNHptLTIgMGgxdjRoLTF2LTR6bTQgMGgxdjRoLTF2LTR6bTIgMGgxdjRoLTF2LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

            {/* Animated Glow Orbs */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>

            {/* Login Card */}
            {/* Royal Glass Card */}
            <Card className="w-full max-w-md mx-4 bg-slate-900/40 backdrop-blur-xl border border-yellow-500/30 shadow-2xl shadow-yellow-900/20 relative z-10">
                <CardHeader className="space-y-4 text-center pt-8 pb-6">
                    {/* Logo with Drop Shadow */}
                    <div className="mx-auto">
                        <img
                            src="/logo.png"
                            alt="Edwardian Academy Logo"
                            className="h-24 w-24 object-contain mx-auto drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]"
                        />
                    </div>

                    {/* Metallic Gold Title - Serif */}
                    <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200">
                        Edwardian Academy ERP
                    </h1>

                    {/* Script Subtitle */}
                    <p className="text-lg italic font-serif text-yellow-100/60">
                        Authorized Personnel Only
                    </p>
                </CardHeader>

                <CardContent className="pb-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive" className="bg-red-950/50 border-red-800/50 backdrop-blur">
                                <AlertDescription className="text-red-200">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Username Field */}
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-yellow-100/80 flex items-center gap-2 font-medium">
                                <User className="w-4 h-4 text-yellow-400/70" />
                                Username
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                disabled={isSubmitting}
                                className="bg-blue-950/50 border-yellow-500/20 text-yellow-50 placeholder:text-yellow-100/30 focus:border-yellow-400 focus:ring-yellow-400/20 h-12"
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-yellow-100/80 flex items-center gap-2 font-medium">
                                <Lock className="w-4 h-4 text-yellow-400/70" />
                                Password
                            </Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isSubmitting}
                                className="bg-blue-950/50 border-yellow-500/20 text-yellow-50 placeholder:text-yellow-100/30 focus:border-yellow-400 focus:ring-yellow-400/20 h-12"
                            />
                        </div>

                        {/* Solid Gold Button */}
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-12 bg-gradient-to-b from-yellow-400 via-yellow-500 to-yellow-600 hover:from-yellow-300 hover:via-yellow-400 hover:to-yellow-500 text-yellow-950 font-bold border-t border-yellow-300 shadow-lg shadow-yellow-600/30 transition-all duration-300"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-5 w-5" />
                                    Sign In
                                </>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-yellow-100/40 italic">
                            Protected by bank-grade security
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
};

export default Login;
