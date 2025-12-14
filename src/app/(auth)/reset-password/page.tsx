import { Metadata } from 'next';
import { ResetPasswordContent } from './reset-password-content';

export const metadata: Metadata = {
    title: 'Reset Password',
    description: 'Create a new password for your account.',
    openGraph: {
        title: 'Reset Password | Vonix Network',
        description: 'Create a new password for your account.',
    },
};

export default function ResetPasswordPage() {
    return <ResetPasswordContent />;
}
