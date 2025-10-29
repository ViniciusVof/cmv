import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useUiStore } from '../stores/uiStore';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { sidebarExpanded } = useUiStore();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          sidebarExpanded ? 'ml-64' : 'ml-20'
        }`}
      >
        <Header />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

