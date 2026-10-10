'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Field, { fieldErrors } from '@/components/ui/Field';

const MODES = {
  login: {
    title: 'Welcome back',
    submit: 'Sign in',
    switchText: 'New to Bookly?',
    switchLabel: 'Create an account',
    switchHref: '/register',
  },
  register: {
    title: 'Create your account',
    submit: 'Create account',
    switchText: 'Already have an account?',
    switchLabel: 'Sign in',
    switchHref: '/login',
  },
};

// Only allow same-origin redirects after sign-in. Resolving with URL catches
// tricks like "//evil.com" and "/\evil.com" that browsers treat as other hosts.
function safeNext(value) {
  if (!value || !value.startsWith('/') || typeof window === 'undefined') return '/';
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin ? `${url.pathname}${url.search}${url.hash}` : '/';
  } catch {
    return '/';
  }
}

export default function AuthForm({ mode }) {
  const copy = MODES[mode];
  const auth = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const errors = fieldErrors(error);

  useEffect(() => {
    if (auth.ready && auth.user) router.replace(next);
  }, [auth.ready, auth.user, next, router]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') await auth.login({ email: form.email, password: form.password });
      else await auth.register(form);
      router.replace(next);
    } catch (err) {
      setError(err);
      setSubmitting(false);
    }
  };

  const switchHref = next === '/' ? copy.switchHref : `${copy.switchHref}?next=${encodeURIComponent(next)}`;

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">{copy.title}</h1>
      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4 rounded-[18px] border border-line bg-card p-6">
        {error && !Object.keys(errors).length && (
          <p role="alert" className="rounded-xl bg-rose-soft px-4 py-3 text-sm font-medium text-rose">
            {error.message}
          </p>
        )}
        {mode === 'register' && (
          <Field label="Your name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} required />
        )}
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} required />
        <Field
          label="Password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          hint={mode === 'register' ? 'At least 8 characters.' : undefined}
          required
        />
        <Button type="submit" size="lg" loading={submitting} className="mt-2 w-full">
          {copy.submit}
        </Button>
      </form>
      <p className="mt-6 text-center text-ink-soft">
        {copy.switchText}{' '}
        <Link href={switchHref} className="font-semibold text-ink underline underline-offset-4">
          {copy.switchLabel}
        </Link>
      </p>
      {mode === 'login' && (
        <p className="mt-4 text-center text-sm text-ink-soft">
          Want to manage events? Sign in with the admin account from your <code>.env</code>.
        </p>
      )}
    </div>
  );
}
