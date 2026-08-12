import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import Mobile from './pages/Mobile';
import Detail from './pages/Detail';
import Monitor from './pages/Monitor';
import { trackProductEvent } from './lib/product-analytics';

function AnalyticsRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    void trackProductEvent('page_view');
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AnalyticsRouteTracker />
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mobile" element={<Mobile />} />
          <Route path="/detail/:id" element={<Detail />} />
          <Route path="/monitor" element={<Monitor />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
