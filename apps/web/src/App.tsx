/**
 * Main App Component
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TestPage } from './presentation/pages/TestPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
