import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useToast } from './hooks/useToast';
import ToastContainer from './components/common/Toast';
import LoadingSpinner from './components/common/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute, PublicOnlyRoute, RootRedirect } from './components/auth/RouteGuards';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import MemberLayout from './components/layout/MemberLayout';

// Login page
const Login = lazy(() => import('./pages/Login'));

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
const NewsletterList = lazy(() => import('./pages/admin/NewsletterList'));
const NewsletterEdit = lazy(() => import('./pages/admin/NewsletterEdit'));
const FiscalYears = lazy(() => import('./pages/admin/FiscalYears'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const Documents = lazy(() => import('./pages/admin/Documents'));
const DocumentEditor = lazy(() => import('./pages/admin/DocumentEditor'));
const ApplicationDetail = lazy(() => import('./pages/admin/ApplicationDetail'));
const MemberCreate = lazy(() => import('./pages/admin/MemberCreate'));

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
      <AuthProvider>
        <ToastContainer toasts={toasts} />
        <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Root redirect */}
            <Route path="/" element={<RootRedirect />} />

            {/* Login */}
            <Route path="/signin" element={
              <PublicOnlyRoute><Login /></PublicOnlyRoute>
            } />

            {/* Public routes - no auth required */}
            <Route element={<PublicLayout />}>
              <Route path="/apply" element={<Apply />} />
              <Route path="/apply/confirm" element={<ApplyConfirm />} />
              <Route path="/apply/complete" element={<ApplyComplete />} />
              <Route path="/complete" element={<ApplyComplete />} />
            </Route>

            {/* Admin routes - requires admin/admin_member */}
            <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/dashboard" element={<Dashboard />} />
              <Route path="/admin/members" element={<MemberList />} />
              <Route path="/admin/members/new" element={<MemberCreate />} />
              <Route path="/admin/members/:memberId" element={<MemberDetail />} />
              <Route path="/admin/applications" element={<Applications />} />
              <Route path="/admin/applications/:applicationId" element={<ApplicationDetail />} />
              <Route path="/admin/dues" element={<DuesManagement />} />
              <Route path="/admin/dues-management" element={<DuesManagement />} />
              <Route path="/admin/organization" element={<OrgChart />} />
              <Route path="/admin/organization-chart" element={<OrgChart />} />
              <Route path="/admin/delivery" element={<NewsletterList />} />
              <Route path="/admin/newsletters" element={<NewsletterList />} />
              <Route path="/admin/newsletters/new" element={<NewsletterEdit />} />
              <Route path="/admin/newsletters/:id/edit" element={<NewsletterEdit />} />
              <Route path="/admin/newsletters/template/:id/edit" element={<NewsletterEdit />} />
              <Route path="/admin/fiscal-years" element={<FiscalYears />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/admin/documents" element={<Documents />} />
              <Route path="/admin/documents/new" element={<DocumentEditor />} />
              <Route path="/admin/documents/:documentId/edit" element={<DocumentEditor />} />
            </Route>

            {/* Member routes - requires authentication */}
            <Route element={<ProtectedRoute><MemberLayout /></ProtectedRoute>}>
              <Route path="/directory" element={<Directory />} />
              <Route path="/directory/members/:memberId" element={<MemberProfile />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/info" element={<BasicInfo />} />
              <Route path="/organization" element={<OrgChartView />} />
              <Route path="/manual" element={<Manual />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
