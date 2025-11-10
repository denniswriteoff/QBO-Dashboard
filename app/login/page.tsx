'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm border border-gray-200 dark:border-white/10 rounded-xl p-6 sm:p-8">
        {/* Logo and Branding */}
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">QBO Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Sign in to access your dashboard</p>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            const res = await signIn('credentials', { email, password, redirect: true, callbackUrl: '/' });
            if (res?.error) setError('Invalid credentials');
          }}
          className="space-y-4"
        >
          <input
            className="w-full h-12 sm:h-11 rounded-md border border-gray-300 dark:border-white/20 bg-white dark:bg-black px-4 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <input
            className="w-full h-12 sm:h-11 rounded-md border border-gray-300 dark:border-white/20 bg-white dark:bg-black px-4 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <div className="text-sm text-red-600 text-center">{error}</div>}
          <button 
            type="submit" 
            className="w-full h-12 sm:h-11 rounded-md bg-black text-white dark:bg-white dark:text-black hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black font-medium text-base sm:text-sm transition-opacity"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}

