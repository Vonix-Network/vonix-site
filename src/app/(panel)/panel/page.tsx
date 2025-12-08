import { PanelClient } from './panel-client';

export const metadata = {
    title: 'Server Panel | Vonix Network',
    description: 'Manage your Minecraft servers with real-time console, file management, and more',
};

export default function PanelPage() {
    return <PanelClient />;
}
