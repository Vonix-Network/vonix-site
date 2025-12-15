import { Metadata } from 'next';
import { CompleteDiscordRegistrationForm } from './complete-discord-registration-form';

export const metadata: Metadata = {
    title: 'Complete Registration',
    description: 'Complete your Vonix Network registration with your Discord account.',
    openGraph: {
        title: 'Complete Registration | Vonix Network',
        description: 'Complete your Vonix Network registration with your Discord account.',
    },
};

export default function CompleteDiscordRegistrationPage() {
    return <CompleteDiscordRegistrationForm />;
}
