import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../stores/uiStore';
import { 
  MdDashboard, 
  MdInventory, 
  MdBusiness, 
  MdReceipt, 
  MdAttachMoney, 
  MdTrendingDown, 
  MdSettings,
  MdExpandMore,
  MdExpandLess,
  MdPointOfSale
} from 'react-icons/md';
import type { IconType } from 'react-icons';

interface MenuItem {
  name: string;
  icon: IconType;
  path?: string;
  subItems?: { name: string; path: string }[];
}

const menuItems: MenuItem[] = [
  { name: 'Dashboard', icon: MdDashboard, path: '/dashboard' },
  { 
    name: 'Estoque', 
    icon: MdInventory, 
    subItems: [
      { name: 'Cadastro', path: '/estoque' },
      { name: 'Movimentações em Lote', path: '/estoque/movimentacoes-lote' },
      { name: 'Conciliação', path: '/estoque/conciliacao' },
      { name: 'Relatórios', path: '/estoque/relatorios-conciliacao' },
    ]
  },
  { name: 'Fornecedores', icon: MdBusiness, path: '/fornecedores' },
  { name: 'Fichas Técnicas', icon: MdReceipt, path: '/fichas-tecnicas' },
  { 
    name: 'PDV', 
    icon: MdPointOfSale, 
    subItems: [
      { name: 'Gestão de Caixa', path: '/pdv/caixa' },
      { name: 'Gestão de Pedidos', path: '/pdv' },
      { name: 'Produtos', path: '/pdv/produtos' },
      { name: 'Categorias', path: '/pdv/categorias' },
      { name: 'Clientes', path: '/pdv/clientes' },
      { name: 'Áreas de Entrega', path: '/pdv/areas-entrega' },
      { name: 'Entregadores', path: '/pdv/entregadores' },
      { name: 'Formas de Pagamento', path: '/pdv/formas-pagamento' },
    ]
  },
  { name: 'Custo Fixo', icon: MdAttachMoney, path: '/custo-fixo' },
  { name: 'Custo Variável', icon: MdTrendingDown, path: '/custo-variavel' },
  { name: 'Configurações', icon: MdSettings, path: '/configuracoes' },
];

export function Sidebar() {
  const { sidebarExpanded, toggleSidebar } = useUiStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Expandir automaticamente o menu se estiver em uma página de submenu
  const getInitialExpandedMenus = () => {
    const expanded: Record<string, boolean> = {};
    menuItems.forEach(item => {
      if (item.subItems) {
        const isOnSubPage = item.subItems.some(subItem => location.pathname === subItem.path);
        if (isOnSubPage) {
          expanded[item.name] = true;
        }
      }
    });
    return expanded;
  };
  
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>(getInitialExpandedMenus());

  // Atualizar menus expandidos quando a rota mudar (mantendo os que já estavam expandidos)
  useEffect(() => {
    setExpandedMenus(prev => {
      const updated = { ...prev };
      menuItems.forEach(item => {
        if (item.subItems) {
          const isOnSubPage = item.subItems.some(subItem => location.pathname === subItem.path);
          if (isOnSubPage) {
            updated[item.name] = true;
          }
        }
      });
      return updated;
    });
  }, [location.pathname]);

  const handleNavigate = (path: string) => {
    if (path) {
      navigate(path);
    }
  };

  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuName]: !prev[menuName]
    }));
  };

  const isMenuActive = (item: MenuItem) => {
    if (item.path) {
      return location.pathname === item.path;
    }
    if (item.subItems) {
      return item.subItems.some(subItem => location.pathname === subItem.path);
    }
    return false;
  };

  const isSubItemActive = (path: string) => {
    return location.pathname === path;
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
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isExpanded = expandedMenus[item.name];
              const isActive = isMenuActive(item);

              if (hasSubItems) {
                // Menu com subitens
                return (
                  <li key={item.name}>
                    <button
                      onClick={() => {
                        if (sidebarExpanded) {
                          toggleMenu(item.name);
                        } else {
                          // Se colapsado, expandir e mostrar primeiro subitem
                          navigate(item.subItems![0].path);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      title={!sidebarExpanded ? item.name : undefined}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                      {sidebarExpanded && (
                        <>
                          <span className="text-sm truncate flex-1 text-left">{item.name}</span>
                          {isExpanded ? (
                            <MdExpandLess className="w-4 h-4 flex-shrink-0" />
                          ) : (
                            <MdExpandMore className="w-4 h-4 flex-shrink-0" />
                          )}
                        </>
                      )}
                    </button>
                    {sidebarExpanded && isExpanded && item.subItems && (
                      <ul className="pl-4 mt-1 space-y-1">
                        {item.subItems.map((subItem) => {
                          const isSubActive = isSubItemActive(subItem.path);
                          return (
                            <li key={subItem.path}>
                              <button
                                onClick={() => handleNavigate(subItem.path)}
                                className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                                  isSubActive
                                    ? 'bg-blue-100 text-blue-700 font-medium'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                <div className="w-2 h-2 rounded-full bg-current" />
                                <span className="truncate">{subItem.name}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              } else {
                // Menu simples
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigate(item.path!)}
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
              }
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

