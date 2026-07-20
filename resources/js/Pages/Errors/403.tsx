import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/Components/ui/Button';

interface Props {
  message?: string;
}

export default function Forbidden({ message }: Props) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <Head title="Access Denied" />
      <div className="max-w-md w-full text-center bg-slate-900/40 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5">
          <ShieldOff className="w-7 h-7 text-rose-400" />
        </div>
        <h1 className="text-lg font-bold text-slate-100 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-400 mb-6">
          {message || "Your role doesn't have permission to access this section. Contact your administrator if you believe this is a mistake."}
        </p>
        <Link href="/dashboard">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
