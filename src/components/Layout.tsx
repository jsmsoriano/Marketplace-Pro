import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from './AppSidebar';
import BottomNav from './BottomNav';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen bg-background flex w-full">
        {!isMobile && <AppSidebar />}
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <div className={cn('min-h-screen flex flex-col', isMobile ? 'pb-16' : '')}>
            <Header />
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
              <div className={cn('w-full mx-auto', isMobile ? 'px-3 py-4' : 'p-4 sm:p-6')}>
                {children}
              </div>
            </main>
          </div>
        </SidebarInset>
        {isMobile && <BottomNav />}
      </div>
    </SidebarProvider>
  );
};

export default Layout;
