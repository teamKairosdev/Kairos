import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import RootLayoutClient from '@/components/RootLayoutClient';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kairos — AI 커리어 플랫폼',
  description: 'Kairos — AI 기반 커리어 플랫폼. 이력서 고도화, 모의 면접, ATS 분석.',
  themeColor: '#f9fafb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <RootLayoutClient>
            {children}
          </RootLayoutClient>
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
