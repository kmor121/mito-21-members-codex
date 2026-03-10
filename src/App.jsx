import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/common/Toast';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import MemberLayout from './components/layout/MemberLayout';

// Public pages
const Landing = lazy(() => import('./pages/public/Landing'));
const Apply = lazy(() => import('./pages/public/Apply'));
const ApplyConfirm = lazy(() => import('./pages/public/ApplyConfirm'));
const ApplyComplete = lazy(() => import('./pages/public/ApplyComplete'));

// Admin pages
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const MemberList = lazy(() => import('./pages/admin/MemberList'));
const MemberDetail = lazy(() => import('./pages/admin/MemberDetail'));
const Applications = lazy(() => import('./pages/admin/Applications'));
const DuesManagement = lazy(() => import('./pages/admin/DuesManagement'));
const OrgChart = lazy(() => import('./pages/admin/OrgChart'));
const Newsletters = lazy(() => import('./pages/admin/Newsletters'));
const FiscalYears = lazy(() => import('./pages/admin/FiscalYears'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Documents = lazy(() => import('./pages/admin/Documents'));

// Member pages
const Directory = lazy(() => import('./pages/member/Directory'));
const MemberProfile = lazy(() => import('./pages/member/MemberProfile'));
const MyPage = lazy(() => import('./pages/member/MyPage'));
const BasicInfo = lazy(() => import('./pages/member/BasicInfo'));
const OrgChartView = lazy(() => import('./pages/member/OrgChartView'));
const Manual = lazy(() => import('./pages/member/Manual'));

function PageFallback() {
  return (
    <section className="admin-shell">
      <section className="card panel-card single-panel">
        <div className="card-body">
          <LoadingSpinner />
        </div>
      </section>
    </section>
  );
}

export default function App() {
  const { toasts, showToast } = useToast();

  // Expose showToast globally for components that need it
  window.__showToast = showToast;

  return (
    <BrowserRouter>
      <ToastContainer toasts={toasts} />
      <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/apply" element={<Apply />} />
            <Route path="/apply/confirm" element={<ApplyConfirm />} />
            <Route path="/apply/complete" element={<ApplyComplete />} />
            <Route path="/complete" element={<ApplyComplete />} />
          </Route>

          {/* Admin routes */}
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/dashboard" element={<Dashboard />} />
            <Route path="/admin/members" element={<MemberList />} />
            <Route path="/admin/members/:memberId" element={<MemberDetail />} />
            <Route path="/admin/applications" element={<Applications />} />
            <Route path="/admin/dues" element={<DuesManagement />} />
            <Route path="/admin/dues-management" element={<DuesManagement />} />
            <Route path="/admin/organization" element={<OrgChart />} />
            <Route path="/admin/organization-chart" element={<OrgChart />} />
            <Route path="/admin/delivery" element={<Newsletters />} />
            <Route path="/admin/newsletters" element={<Newsletters />} />
            <Route path="/admin/fiscal-years" element={<FiscalYears />} />
            <Route path="/admin/settings" element={<Settings />} />
            <Route path="/admin/documents" element={<Documents />} />
          </Route>

          {/* Member routes */}
          <Route element={<MemberLayout />}>
            <Route path="/directory" element={<Directory />} />
            <Route path="/directory/members/:memberId" element={<MemberProfile />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/info" element={<BasicInfo />} />
            <Route path="/organization" element={<OrgChartView />} />
            <Route path="/manual" element={<Manual />} />
          </Route>

          {/* Catch-all */}
          <Route element={<PublicLayout />}>
            <Route path="*" element={<Landing />} />
          </Route>
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
