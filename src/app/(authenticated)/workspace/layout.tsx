import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession } from '@/server/auth';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isMock = process.env.NODE_ENV !== 'production' && cookieStore.get('kairos_mock_session')?.value === '1';
  if (!isMock) {
    const token = cookieStore.get('kairos_session')?.value;
    if (!token || !(await verifySession(token))) redirect('/auth/login');
  }
  return children;
}
