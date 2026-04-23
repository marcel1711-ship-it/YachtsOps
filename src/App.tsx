import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Maintenance } from './pages/Maintenance';
import { Inventory } from './pages/Inventory';
import { InventoryDetail } from './pages/InventoryDetail';
import { LocationView } from './pages/LocationView';
import { History } from './pages/History';
import { Equipment } from './pages/Equipment';
import { Manuals } from './pages/Manuals';
import { Vessels } from './pages/Vessels';
import { Customers } from './pages/Customers';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { Fuel } from './pages/Fuel';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // Support QR scan deep-link: ?location=Engine+Room+...
  const getInitialPage = () => {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('location');
    if (loc) return { page: 'location-view', params: { location: decodeURIComponent(loc) } };
    return { page: 'dashboard', params: null };
  };

  const initial = getInitialPage();
  const [currentPage, setCurrentPage] = useState(initial.page);
  const [pageParams, setPageParams] = useState<any>(initial.params);
  // Remember deep-link destination so we can redirect there after login
  const [pendingPage] = useState(initial);

  const handleNavigate = (page: string, params?: any) => {
    setCurrentPage(page);
    setPageParams(params || null);
  };

  const handleLogin = () => {
    if (pendingPage.page !== 'dashboard') {
      setCurrentPage(pendingPage.page);
      setPageParams(pendingPage.params);
    } else {
      setCurrentPage('dashboard');
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'maintenance':
        return <Maintenance onNavigate={handleNavigate} params={pageParams} />;
      case 'inventory':
        return <Inventory onNavigate={handleNavigate} />;
      case 'inventory-detail':
        return <InventoryDetail onNavigate={handleNavigate} params={pageParams} />;
      case 'location-view':
        return <LocationView onNavigate={handleNavigate} location={pageParams?.location || ''} />;
      case 'history':
        return <History onNavigate={handleNavigate} />;
      case 'equipment':
        return <Equipment onNavigate={handleNavigate} />;
      case 'manuals':
        return <Manuals onNavigate={handleNavigate} />;
      case 'vessels':
        return <Vessels onNavigate={handleNavigate} />;
      case 'customers':
        return <Customers onNavigate={handleNavigate} />;
      case 'users':
        return <Users onNavigate={handleNavigate} companyId={pageParams?.companyId} openAddUser={pageParams?.openAddUser} />;
      case 'fuel':
        return <Fuel onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />
      <div className="ml-64">
        <Header onNavigate={handleNavigate} />
        <main className="pt-16 p-6">
          <div className="max-w-[1600px] mx-auto">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
