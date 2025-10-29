import { Layout } from '../components/Layout';
import { useAuthStore } from '../stores/authStore';

export function Dashboard() {
  const { user } = useAuthStore();

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            Bem-vindo, <span className="font-semibold">{user?.name}</span>!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Cards de Estatísticas */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Vendas Hoje
            </h3>
            <p className="text-2xl font-bold text-gray-800">R$ 0,00</p>
            <p className="text-xs text-gray-500 mt-1">0 vendas</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Estoque
            </h3>
            <p className="text-2xl font-bold text-gray-800">0</p>
            <p className="text-xs text-gray-500 mt-1">itens cadastrados</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              Fornecedores
            </h3>
            <p className="text-2xl font-bold text-gray-800">0</p>
            <p className="text-xs text-gray-500 mt-1">ativos</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-600 mb-2">
              CMV Global
            </h3>
            <p className="text-2xl font-bold text-gray-800">0%</p>
            <p className="text-xs text-gray-500 mt-1">do mês atual</p>
          </div>
        </div>

        {/* Menu de Acesso Rápido */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'PDV', icon: '🛒', color: 'bg-blue-100 text-blue-600' },
              { name: 'Estoque', icon: '📦', color: 'bg-green-100 text-green-600' },
              { name: 'Fornecedores', icon: '🏢', color: 'bg-yellow-100 text-yellow-600' },
              { name: 'CMV', icon: '📊', color: 'bg-purple-100 text-purple-600' },
              { name: 'Custo Fixo', icon: '💰', color: 'bg-red-100 text-red-600' },
              { name: 'Relatórios', icon: '📈', color: 'bg-indigo-100 text-indigo-600' },
            ].map((item) => (
              <button
                key={item.name}
                className={`${item.color} p-4 rounded-lg hover:opacity-80 transition-opacity text-center`}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm font-medium">{item.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Informações do Usuário */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Informações da Conta
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Nome:</span>
              <span className="font-medium text-gray-800">{user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium text-gray-800">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

