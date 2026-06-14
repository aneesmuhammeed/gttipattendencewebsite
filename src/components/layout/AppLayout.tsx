import { Outlet } from 'react-router-dom';
import { Sidebar, BottomNav } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <Header />

      <main className="lg:ml-60 pt-0 lg:pt-0 pb-16 lg:pb-0">
        {/* Mobile spacer */}
        <div className="lg:hidden h-14" />
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
