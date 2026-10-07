import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import ThemeToggle from './ThemeToggle';
import { ImportOrdersButton } from './ImportOrdersButton';
import { useIsMobile } from '@/hooks/use-mobile';

const titles: Record<string, string> = {
  '/': 'Overview',
  '/sourcing': 'Sourcing',
  '/optimize': 'Listing Lab',
  '/research': 'Market Signals',
  '/trends': 'Market Signals',
  '/pull-list': 'Daily Pull List',
  '/inventory': 'Inventory Map',
  '/inventory-audit': 'Inventory Audit',
  '/calculator': 'Sales Calculator',
  '/reports': 'Reports',
  '/sizes': 'Size Conversion',
};

const Header = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const title = titles[location.pathname] || 'Listing Pilot';

  return (
    <header className="bg-background border-b border-border px-4 sm:px-6 py-3 sticky top-0 z-40 print:hidden">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {!isMobile && (
            <SidebarTrigger className="p-2">
              <Menu className="h-4 w-4" />
            </SidebarTrigger>
          )}
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex items-center gap-1">
          {!isMobile && <ImportOrdersButton compact />}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;
