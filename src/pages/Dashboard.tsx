import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuthStore } from '../stores/authStore';
import {
  MdInventory,
  MdBusiness,
  MdReceipt,
  MdAttachMoney,
  MdTrendingDown,
  MdSettings,
  MdAccountCircle
} from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { ingredientService } from '../services/ingredientService';
import { supplierService } from '../services/supplierService';
import { recipeService } from '../services/recipeService';
import { fixedCostService } from '../services/fixedCostService';
import { variableCostService } from '../services/variableCostService';

export function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    ingredients: 0,
    suppliers: 0,
    recipes: 0,
    totalFixedCosts: 0,
    totalVariableCosts: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [ingredients, suppliers, recipes, fixedCosts, variableCosts] = await Promise.all([
          ingredientService.getAll(),
          supplierService.getAll(),
          recipeService.getAll(),
          fixedCostService.getTotal(),
          variableCostService.getTotalPercentage(),
        ]);
        
        setStats({
          ingredients: ingredients.length,
          suppliers: suppliers.length,
          recipes: recipes.length,
          totalFixedCosts: fixedCosts,
          totalVariableCosts: variableCosts,
        });
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      }
    };

    loadStats();
  }, []);

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
          <div 
            className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/estoque')}
          >
            <div className="bg-green-100 p-3 rounded-lg">
              <MdInventory className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                Estoque
              </h3>
              <p className="text-2xl font-bold text-gray-800">{stats.ingredients}</p>
              <p className="text-xs text-gray-500 mt-1">itens cadastrados</p>
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/fornecedores')}
          >
            <div className="bg-yellow-100 p-3 rounded-lg">
              <MdBusiness className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                Fornecedores
              </h3>
              <p className="text-2xl font-bold text-gray-800">{stats.suppliers}</p>
              <p className="text-xs text-gray-500 mt-1">cadastrados</p>
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/fichas-tecnicas')}
          >
            <div className="bg-blue-100 p-3 rounded-lg">
              <MdReceipt className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                Fichas Técnicas
              </h3>
              <p className="text-2xl font-bold text-gray-800">{stats.recipes}</p>
              <p className="text-xs text-gray-500 mt-1">cadastradas</p>
            </div>
          </div>

          <div 
            className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500 flex items-start gap-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/custo-fixo')}
          >
            <div className="bg-purple-100 p-3 rounded-lg">
              <MdAttachMoney className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-2">
                Custo Fixo Total
              </h3>
              <p className="text-2xl font-bold text-gray-800">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(stats.totalFixedCosts)}
              </p>
              <p className="text-xs text-gray-500 mt-1">mensal</p>
            </div>
          </div>
        </div>

        {/* Menu de Acesso Rápido */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Acesso Rápido
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Estoque', icon: MdInventory, color: 'bg-green-100 text-green-600', path: '/estoque' },
              { name: 'Fornecedores', icon: MdBusiness, color: 'bg-yellow-100 text-yellow-600', path: '/fornecedores' },
              { name: 'Fichas Técnicas', icon: MdReceipt, color: 'bg-blue-100 text-blue-600', path: '/fichas-tecnicas' },
              { name: 'Custo Fixo', icon: MdAttachMoney, color: 'bg-orange-100 text-orange-600', path: '/custo-fixo' },
              { name: 'Custo Variável', icon: MdTrendingDown, color: 'bg-red-100 text-red-600', path: '/custo-variavel' },
              { name: 'Configurações', icon: MdSettings, color: 'bg-purple-100 text-purple-600', path: '/configuracoes' },
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`${item.color} p-4 rounded-lg hover:opacity-80 transition-opacity text-center flex flex-col items-center gap-2 cursor-pointer`}
                >
                  <IconComponent className="w-8 h-8" />
                  <div className="text-sm font-medium">{item.name}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Informações do Usuário */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <MdAccountCircle className="w-6 h-6 text-blue-600" />
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

