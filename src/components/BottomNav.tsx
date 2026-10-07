import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Calculator, ClipboardCheck, FileSpreadsheet, Grid3X3, ListChecks, Menu, Ruler, Search, ShoppingBag, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const allItems = [
  { icon: BarChart3, label: 'Overview', shortLabel: 'Overview', description: 'Store performance at a glance', path: '/' },
  { icon: ListChecks, label: 'Daily pull list', shortLabel: 'Pull', description: 'Find and fulfill today’s sales', path: '/pull-list' },
  { icon: Grid3X3, label: 'Inventory map', shortLabel: 'Inventory', description: 'Bins, locations, and available space', path: '/inventory' },
  { icon: ClipboardCheck, label: 'Inventory audit', shortLabel: 'Audit', description: 'Verify active listings against physical stock', path: '/inventory-audit' },
  { icon: ShoppingBag, label: 'Sourcing', shortLabel: 'Source', description: 'Buy recommendations from your sales', path: '/sourcing' },
  { icon: Calculator, label: 'Sales calculator', shortLabel: 'Calc', description: 'Estimate eBay proceeds and profit', path: '/calculator' },
  { icon: FileSpreadsheet, label: 'Reports', shortLabel: 'Reports', description: 'Customize and print marketplace reports', path: '/reports' },
  { icon: Search, label: 'Market signals', shortLabel: 'Signals', description: 'Brand, category, and demand trends', path: '/research' },
  { icon: Sparkles, label: 'Listing lab', shortLabel: 'Listing', description: 'Titles, descriptions, and title audits', path: '/optimize' },
  { icon: Ruler, label: 'Size conversion', shortLabel: 'Sizes', description: 'Brand charts and tags to eBay Size', path: '/sizes' },
];

const primaryPaths = ['/', '/pull-list', '/sourcing', '/calculator'];
const primaryItems = allItems.filter((item) => primaryPaths.includes(item.path));

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const isActive = (path: string) => path === '/research' ? location.pathname === '/research' || location.pathname === '/trends' : location.pathname === path;
  const moreIsActive = !primaryPaths.some(isActive);

  if (!isMobile) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85 print:hidden" aria-label="Primary navigation">
      <div className="grid grid-cols-5">
        {primaryItems.map(({ icon: Icon, shortLabel, label, path }) => (
          <button key={path} type="button" aria-label={label} aria-current={isActive(path) ? 'page' : undefined} onClick={() => navigate(path)} className={cn('relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors', isActive(path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
            {isActive(path) ? <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" /> : null}
            <Icon className="h-5 w-5" />
            <span>{shortLabel}</span>
          </button>
        ))}

        <Sheet>
          <SheetTrigger asChild>
            <button type="button" aria-label="Open all tools" className={cn('relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium transition-colors', moreIsActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
              {moreIsActive ? <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-primary" /> : null}
              <Menu className="h-5 w-5" />
              <span>More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="flex w-[88vw] max-w-sm flex-col p-0">
            <SheetHeader className="border-b border-border px-5 py-5 text-left">
              <SheetTitle>Marketplace Pro</SheetTitle>
              <SheetDescription>Choose a tool for your resale workflow.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-1">
                {allItems.map(({ icon: Icon, label, description, path }) => (
                  <SheetClose asChild key={path}>
                    <button type="button" aria-current={isActive(path) ? 'page' : undefined} onClick={() => navigate(path)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors', isActive(path) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', isActive(path) ? 'bg-white/15' : 'bg-muted')}><Icon className="h-5 w-5" /></span>
                      <span className="min-w-0"><span className="block text-sm font-semibold">{label}</span><span className={cn('mt-0.5 block truncate text-xs', isActive(path) ? 'text-primary-foreground/75' : 'text-muted-foreground')}>{description}</span></span>
                    </button>
                  </SheetClose>
                ))}
              </div>
            </div>
            <div className="border-t border-border px-5 py-4"><p className="text-xs font-medium">Source what sells.</p><p className="mt-1 text-[11px] text-muted-foreground">Sales, inventory, sourcing, and pricing in one place.</p></div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default BottomNav;
