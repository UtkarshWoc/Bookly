import { Suspense } from 'react';
import AuthForm from '@/components/auth/AuthForm';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
