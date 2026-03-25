import React, { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router'
import { RootLayout } from './components/layout/RootLayout'
import { HomePage } from './pages/HomePage'

// ─── Lazy-loaded pages ────────────────────────────────────────────────────────

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const BrowsePage = lazy(() => import('./pages/BrowsePage').then((m) => ({ default: m.BrowsePage })))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const UploadPage = lazy(() => import('./pages/UploadPage').then((m) => ({ default: m.UploadPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const ElaraPage = lazy(() => import('./pages/ElaraPage').then((m) => ({ default: m.ElaraPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const BookmarksPage = lazy(() => import('./pages/BookmarksPage').then((m) => ({ default: m.BookmarksPage })))
const DangerZonePage = lazy(() => import('./pages/DangerZonePage').then((m) => ({ default: m.DangerZonePage })))

// Admin
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const AdminPage = lazy(() => import('./pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))
const AdminProjectsPage = lazy(() => import('./pages/admin/AdminProjectsPage').then((m) => ({ default: m.AdminProjectsPage })))
const AdminSupervisorsPage = lazy(() => import('./pages/admin/AdminSupervisorsPage').then((m) => ({ default: m.AdminSupervisorsPage })))
const AdminDepartmentsPage = lazy(() => import('./pages/admin/AdminDepartmentsPage').then((m) => ({ default: m.AdminDepartmentsPage })))
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })))
const AdminFlaggedCommentsPage = lazy(() => import('./pages/admin/AdminFlaggedCommentsPage').then((m) => ({ default: m.AdminFlaggedCommentsPage })))

// ─── Loading fallback ─────────────────────────────────────────────────────────

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#E5E7EB] border-t-[#0066FF] animate-spin" />
    </div>
  )
}

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <Lazy><LoginPage /></Lazy> },
      { path: 'register', element: <Lazy><RegisterPage /></Lazy> },
      { path: 'projects', element: <Lazy><BrowsePage /></Lazy> },
      { path: 'projects/:id', element: <Lazy><ProjectDetailPage /></Lazy> },
      { path: 'profile/:id', element: <Lazy><ProfilePage /></Lazy> },
      { path: 'upload', element: <Lazy><UploadPage /></Lazy> },
      { path: 'dashboard', element: <Lazy><DashboardPage /></Lazy> },
      { path: 'elara', element: <Lazy><ElaraPage /></Lazy> },
      { path: 'settings', element: <Lazy><SettingsPage /></Lazy> },
      { path: 'bookmarks', element: <Lazy><BookmarksPage /></Lazy> },
      { path: 'danger-zone', element: <Lazy><DangerZonePage /></Lazy> },
      {
        path: 'admin',
        element: <Lazy><AdminLayout /></Lazy>,
        children: [
          { index: true, element: <Lazy><AdminPage /></Lazy> },
          { path: 'users', element: <Lazy><AdminUsersPage /></Lazy> },
          { path: 'projects', element: <Lazy><AdminProjectsPage /></Lazy> },
          { path: 'supervisors', element: <Lazy><AdminSupervisorsPage /></Lazy> },
          { path: 'departments', element: <Lazy><AdminDepartmentsPage /></Lazy> },
          { path: 'ai-categories', element: <Lazy><AdminCategoriesPage /></Lazy> },
          { path: 'flagged-comments', element: <Lazy><AdminFlaggedCommentsPage /></Lazy> },
        ],
      },
      { path: '*', element: <Lazy><NotFoundPage /></Lazy> },
    ],
  },
])