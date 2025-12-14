import { Metadata } from 'next';
import { LoginForm } from './login-form';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your Vonix Network account to manage your profile, view stats, and more.',
  openGraph: {
    title: 'Login | Vonix Network',
    description: 'Sign in to your Vonix Network account to manage your profile, view stats, and more.',
  },
};

export default function LoginPage() {
  return <LoginForm />;
}
