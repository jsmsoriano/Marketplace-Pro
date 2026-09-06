import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Grid3X3, ListChecks, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const items = [
  { icon: BarChart3, label: 'Overview', path: '/' },
  { icon: ListChecks, label: 'Pull', path: '/pull-list' },
  { icon: Grid3X3, label: 'Map', path: '/inventory' },
  { icon: ShoppingBag, label: 'Source', path: '/sourcing' },
  { icon: Search, label: 'Signals', path: '/research' },
  { icon: Sparkles, label: 'Listing', path: '/optimize' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)] print:hidden">
      <div className="flex">
        {items.map(({ icon: Icon, label, path }) => {
          const isActive = path === '/research'
            ? location.pathname === '/research' || location.pathname === '/trends'
            : location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] transition-colors sm:text-xs',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
