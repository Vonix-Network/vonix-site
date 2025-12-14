import { Metadata } from 'next';
import { RegisterForm } from './register-form';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Join Vonix Network today. Create an account to access the forums, user profiles, and more.',
  openGraph: {
    title: 'Register | Vonix Network',
    description: 'Join Vonix Network today. Create an account to access the forums, user profiles, and more.',
  },
};

export default function RegisterPage() {
  return <RegisterForm />;
}
