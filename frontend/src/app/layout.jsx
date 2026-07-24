import './globals.css';
import Providers from '@/components/layout/Providers';

export const metadata = {
  title: 'EMS — Equipment Management System',
  description: 'Next-Gen Equipment Management & Predictive Analytics',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
