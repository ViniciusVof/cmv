import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../stores/uiStore';
import { 
  MdDashboard, 
  MdInventory, 
  MdBusiness, 
  MdReceipt, 
  MdAttachMoney, 
  MdTrendingDown, 
  MdSettings 
} from 'react-icons/md';
import type { IconType } from 'react-icons';

interface MenuItem {
  name: string;
  icon: IconType;
  path: string;
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', icon: MdDashboard, path: '/dashboard' },
  { name: 'Estoque', icon: MdInventory, path: '/estoque' },
  { name: 'Fornecedores', icon: MdBusiness, path: '/fornecedores' },
  { name: 'Fichas Técnicas', icon: MdReceipt, path: '/fichas-tecnicas' },
  { name: 'Custo Fixo', icon: MdAttachMoney, path: '/custo-fixo' },
  { name: 'Custo Variável', icon: MdTrendingDown, path: '/custo-variavel' },
  { name: 'Configurações', icon: MdSettings, path: '/configuracoes' },
];

export function Sidebar() {
  const { sidebarExpanded, toggleSidebar } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out fixed left-0 top-0 h-screen z-40 ${
        sidebarExpanded ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header do Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {sidebarExpanded && (
            <h2 className="text-lg font-bold text-gray-800">Menu</h2>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors ml-auto"
            title={sidebarExpanded ? 'Colapsar menu' : 'Expandir menu'}
          >
            {sidebarExpanded ? (
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <button
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={!sidebarExpanded ? item.name : undefined}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                    {sidebarExpanded && (
                      <span className="text-sm truncate">{item.name}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

