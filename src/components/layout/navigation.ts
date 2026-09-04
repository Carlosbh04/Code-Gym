import { Dumbbell, Home, LayoutDashboard } from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: typeof Home;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: 'Inicio',
    to: '/',
    icon: Home,
  },
  {
    label: 'Progreso',
    to: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Entrenar',
    to: '/tech/javascript',
    icon: Dumbbell,
  },
];