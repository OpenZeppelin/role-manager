import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { MainLayout } from './components/Layout/MainLayout';
import { Home } from './pages/Home';

/**
 * Root application component
 * Sets up routing and layout structure
 */
function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Additional routes will be added here as features are implemented */}
        </Routes>
      </MainLayout>
    </BrowserRouter>
  );
}

export default App;
