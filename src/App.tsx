import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SalesDataProvider } from '@/contexts/SalesDataContext';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Sourcing from '@/pages/Sourcing';
import OptimizeListing from '@/pages/OptimizeListingV2';
import Research from '@/pages/ResearchV2';
import PullList from '@/pages/PullList';
import InventoryMap from '@/pages/InventoryMap';
import InventoryAudit from '@/pages/InventoryAudit';
import SalesCalculator from '@/pages/SalesCalculator';
import Reports from '@/pages/Reports';
import SizeConversionPage from '@/pages/SizeConversionPage';
import NotFound from '@/pages/NotFound';

function App() {
  return (
    <ThemeProvider>
      <SalesDataProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Routes>
              <Route path="/" element={<Layout><Dashboard /></Layout>} />
              <Route path="/sourcing" element={<Layout><Sourcing /></Layout>} />
              <Route path="/optimize" element={<Layout><OptimizeListing /></Layout>} />
              <Route path="/research" element={<Layout><Research /></Layout>} />
              <Route path="/trends" element={<Layout><Research /></Layout>} />
              <Route path="/pull-list" element={<Layout><PullList /></Layout>} />
              <Route path="/inventory" element={<Layout><InventoryMap /></Layout>} />
              <Route path="/inventory-audit" element={<Layout><InventoryAudit /></Layout>} />
              <Route path="/calculator" element={<Layout><SalesCalculator /></Layout>} />
              <Route path="/reports" element={<Layout><Reports /></Layout>} />
              <Route path="/sizes" element={<Layout><SizeConversionPage /></Layout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </SalesDataProvider>
    </ThemeProvider>
  );
}

export default App;
