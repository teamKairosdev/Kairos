import type { ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  section?: 'main' | 'tools' | 'account';
  featured?: boolean;
  activeMatch?: (pathname: string) => boolean;
}

const CAREER_FEATURE_PATHS = ['/career/diary', '/career/goals', '/career/matches'];

function isCareerOverviewActive(pathname: string): boolean {
  if (pathname === '/career') return true;
  if (!pathname.startsWith('/career/')) return false;
  return !CAREER_FEATURE_PATHS.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: '홈', icon: '홈', section: 'main', activeMatch: (pathname) => pathname === '/' },
  { href: '/resume', label: 'AI 이력서', icon: '이력서', section: 'tools', featured: true },
  { href: '/interview', label: '모의면접', icon: '면접', section: 'tools', featured: true },
  { href: '/ats', label: 'ATS 분석', icon: 'ATS', section: 'tools', featured: true },
  { href: '/humanizer', label: 'Humanizer', icon: '편집', section: 'tools', featured: true },
  { href: '/qa', label: 'Q&A', icon: 'Q&A', section: 'tools' },
  { href: '/career', label: '경력', icon: '경력', section: 'tools', activeMatch: isCareerOverviewActive },
  { href: '/career/diary', label: '경력 일기', icon: '일기', section: 'tools' },
  { href: '/career/goals', label: '목표와 마일스톤', icon: '목표', section: 'tools' },
  { href: '/career/matches', label: '지원 적합도', icon: '매칭', section: 'tools' },
  { href: '/studio', label: '스튜디오', icon: '사진', section: 'tools' },
  { href: '/docs', label: '문서', icon: '문서', section: 'tools' },
  { href: '/community', label: '커뮤니티', icon: '대화', section: 'tools' },
  { href: '/workspace', label: '에이전트 캔버스', icon: '캔버스', section: 'tools' },
  { href: '/contexts', label: '컨텍스트 보관함', icon: '컨텍스트', section: 'tools' },
  { href: '/mentor', label: '3개월 로드맵', icon: '로드맵', section: 'tools' },
  { href: '/messages', label: '준비 메시지', icon: '메시지', section: 'tools' },
  { href: '/settings', label: '설정', icon: '설정', section: 'account' },
];

export const NAV_SECTIONS: { key: NavItem['section']; label: string }[] = [
  { key: 'main', label: '시작' },
  { key: 'tools', label: 'AI 도구' },
  { key: 'account', label: '계정' },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.activeMatch) return item.activeMatch(pathname);
  return pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
}
