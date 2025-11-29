import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { MainLayout } from './components/Layout/MainLayout';
import { AuthorizedAccounts } from './pages/AuthorizedAccounts';
import { Dashboard } from './pages/Dashboard';
import { RoleChanges } from './pages/RoleChanges';
import { Roles } from './pages/Roles';

/**
 * Root application component
 * Sets up routing and layout structure
 */
function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/authorized-accounts" element={<AuthorizedAccounts />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/role-changes" element={<RoleChanges />} />
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
