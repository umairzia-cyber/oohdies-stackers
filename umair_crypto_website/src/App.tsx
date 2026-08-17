import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { ROUTES } from './constants/routes';
import SideNav from './components/navigation/SideNav';
import Navbar from './components/navigation/Navbar';
import Footer from './components/common/Footer';
import ScrollToTop from './components/common/ScrollToTop';
import RainforestBackground from './components/common/RainforestBackground';
import ScreenTexture from './components/common/ScreenTexture';
import Ticker from './components/common/Ticker';
import './styles/index.css';

const Home = lazy(() => import('./pages/Home/Home'));
const Collection = lazy(() => import('./pages/Collection/Collection'));
const Activate = lazy(() => import('./pages/Activate/Activate'));
const MyStack = lazy(() => import('./pages/MyStack/MyStack'));
const TheTrail = lazy(() => import('./pages/TheTrail/TheTrail'));
const Docs = lazy(() => import('./pages/Docs/Docs'));

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-sm)',
        letterSpacing: '0.1em',
      }}
      role="status"
      aria-label="Loading page"
    >
      LOADING...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <WalletProvider>
        <RainforestBackground />
        {/* Both mount; CSS shows exactly one. SideNav leads the tab order
            because it is the primary nav above 1024px. */}
        <SideNav />
        <Navbar />
        <Ticker />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path={ROUTES.HOME} element={<Home />} />
            <Route path={ROUTES.COLLECTION} element={<Collection />} />
            <Route path={ROUTES.ACTIVATE} element={<Activate />} />
            <Route path={ROUTES.MY_STACK} element={<MyStack />} />
            <Route path={ROUTES.THE_TRAIL} element={<TheTrail />} />
            <Route path={ROUTES.DOCS} element={<Docs />} />

            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
        <Footer />
        <ScreenTexture />
      </WalletProvider>
    </BrowserRouter>
  );
}
