import { useNavigate, useLocation } from 'react-router-dom';
import { BarChart3, Calculator, ClipboardCheck, FileSpreadsheet, Grid3X3, ListChecks, Ruler, Search, ShoppingBag, Sparkles } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';

const navItems = [
  { icon: BarChart3, label: 'Overview', path: '/' },
  { icon: ListChecks, label: 'Daily pull list', path: '/pull-list' },
  { icon: Grid3X3, label: 'Inventory map', path: '/inventory' },
  { icon: ClipboardCheck, label: 'Inventory audit', path: '/inventory-audit' },
  { icon: ShoppingBag, label: 'Sourcing', path: '/sourcing' },
  { icon: Calculator, label: 'Sales calculator', path: '/calculator' },
  { icon: FileSpreadsheet, label: 'Reports', path: '/reports' },
  { icon: Search, label: 'Market signals', path: '/research' },
  { icon: Sparkles, label: 'Listing lab', path: '/optimize' },
  { icon: Ruler, label: 'Size conversion', path: '/sizes' },
];

const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader className="border-b border-border px-3 py-4">
        <div className="flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div>
              <p className="font-semibold tracking-tight">Marketplace Pro</p>
              <p className="text-xs text-muted-foreground">Source what sells</p>
            </div>
          )}
          <SidebarTrigger />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ icon: Icon, label, path }) => {
                const isActive = path === '/research'
                  ? location.pathname === '/research' || location.pathname === '/trends'
                  : location.pathname === path;
                return (
                  <SidebarMenuItem key={path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={isCollapsed ? label : undefined}
                      onClick={() => navigate(path)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
