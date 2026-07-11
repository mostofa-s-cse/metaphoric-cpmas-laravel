import { useState, FormEventHandler } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ShieldAlert, HardHat, Eye, EyeOff, Lock, Mail, Loader2, ChevronRight } from 'lucide-react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { websiteSettings } = usePage().props as any;
    const brandInfo = websiteSettings || {};
    const brand = {
        name: brandInfo.nameAlt || brandInfo.name || 'Metaphoric Architect',
        logoUrl: brandInfo.logoUrl || '',
    };

    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <Head title="Log in" />

            {/* Ambient glow blobs */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Full-screen authenticating overlay */}
            {processing && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative flex items-center justify-center mb-6">
                        <div className="absolute w-24 h-24 border-t-2 border-cyan-400 border-solid rounded-full animate-spin"></div>
                        <div
                            className="absolute w-20 h-20 border-r-2 border-blue-500 border-solid rounded-full animate-spin"
                            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
                        ></div>
                        <HardHat className="h-10 w-10 text-cyan-400" />
                    </div>
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse tracking-widest">
                        AUTHENTICATING...
                    </h2>
                    <p className="text-slate-400 text-sm mt-2">Preparing your workspace</p>
                </div>
            )}

            <div className="w-full max-w-md z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8 hover:border-slate-700/60 transition-colors">
                    {/* Branding */}
                    <Link href="/" className="flex flex-col items-center mb-8 group cursor-pointer">
                        <div className="h-14 w-14 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 mb-4 shadow-[0_0_30px_rgba(6,182,212,0.15)] group-hover:scale-105 transition-transform overflow-hidden p-1">
                            {brand.logoUrl ? (
                                <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-contain" />
                            ) : (
                                <HardHat className="h-7 w-7" />
                            )}
                        </div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 tracking-tight group-hover:opacity-80 transition-opacity">
                            {brand.name}
                        </h1>
                        <p className="text-slate-500 text-xs mt-1.5 text-center font-medium">
                            Construction Project Management &amp; Accounting System
                        </p>
                    </Link>

                    {/* Status (e.g. password reset confirmation) */}
                    {status && (
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-400 text-sm mb-6">
                            {status}
                        </div>
                    )}

                    {/* Server error (invalid credentials) */}
                    {errors.email && (
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 text-sm flex items-center gap-2 mb-6 animate-in slide-in-from-top duration-200">
                            <ShieldAlert className="h-4 w-4 shrink-0" />
                            <span>{errors.email}</span>
                        </div>
                    )}

                    <form onSubmit={submit} className="space-y-5" noValidate>
                        {/* Email */}
                        <div>
                            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                <input
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="name@cpmas.com"
                                    autoComplete="username"
                                    autoFocus
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none text-sm transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none text-sm transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-rose-400 text-[11px] mt-1.5 ml-1">{errors.password}</p>
                            )}
                        </div>

                        {/* Remember me + Forgot password */}
                        <div className="flex items-center justify-between text-xs">
                            <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30"
                                />
                                Remember me
                            </label>
                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-slate-400 hover:text-cyan-400 font-medium transition-colors"
                                >
                                    Forgot your password?
                                </Link>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In to Dashboard</span>
                                    <ChevronRight className="h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
