import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { MainLayout } from './components/Layout/MainLayout';
import { ContractProvider } from './context/ContractContext';
import { AuthorizedAccounts } from './pages/AuthorizedAccounts';
import { Dashboard } from './pages/Dashboard';
import { RoleChanges } from './pages/RoleChanges';
import { Roles } from './pages/Roles';

/**
 * Root application component
 * Sets up routing and layout structure
 *
 * ContractProvider wraps inside BrowserRouter to enable:
 * - Shared contract selection state across all pages
 * - Access to selected contract in Dashboard and other pages
 * Feature: 007-dashboard-real-data
 */
function App() {
  return (
    <BrowserRouter>
      <ContractProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/authorized-accounts" element={<AuthorizedAccounts />} />
            <Route path="/roles" element={<Roles />} />
            <Route path="/role-changes" element={<RoleChanges />} />
          </Routes>
        </MainLayout>
      </ContractProvider>
    </BrowserRouter>
  );
}

export default App;
