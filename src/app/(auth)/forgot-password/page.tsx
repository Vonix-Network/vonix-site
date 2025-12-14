import { Metadata } from 'next';
import { ForgotPasswordForm } from './forgot-password-form';

export const metadata: Metadata = {
    title: 'Forgot Password',
    description: 'Reset your Vonix Network account password securely.',
};

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />;
}
