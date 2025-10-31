import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { Category, CategoryFormData, CategoryType } from '../types/category';
import { categoryService } from '../services/categoryService';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSearch,
  MdTrendingUp,
  MdTrendingDown,
} from 'react-icons/md';
import { notifySuccess, notifyError } from '../stores/notificationStore';
import { useDialogStore } from '../stores/dialogStore';

type SortField = 'name' | 'type' | 'isActive';
type SortDirection = 'asc' | 'desc';
type TypeFilter = 'all' | 'revenue' | 'expense';

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'expense',
    description: '',
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const { openConfirm } = useDialogStore();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error) {
      notifyError('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedCategories = useMemo(() => {
    let filtered = categories;

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((cat) => cat.type === typeFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (cat) =>
          cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: string | boolean;
      let bValue: string | boolean;

      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'isActive':
          aValue = a.isActive;
          bValue = b.isActive;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        if (aValue === bValue) return 0;
        return sortDirection === 'asc' ? (aValue ? -1 : 1) : (aValue ? 1 : -1);
      }
      return 0;
    });

    return sorted;
  }, [categories, searchTerm, sortField, sortDirection, typeFilter]);

  const stats = useMemo(() => {
    const revenues = categories.filter((c) => c.type === 'revenue' && c.isActive).length;
    const expenses = categories.filter((c) => c.type === 'expense' && c.isActive).length;
    return { total: categories.length, revenues, expenses };
  }, [categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await categoryService.update(editingId, formData);
        notifySuccess('Categoria atualizada com sucesso');
      } else {
        await categoryService.create(formData);
        notifySuccess('Categoria criada com sucesso');
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        type: 'expense',
        description: '',
        isActive: true,
      });
      loadData();
    } catch (error) {
      notifyError('Erro ao salvar categoria');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      type: category.type,
      description: category.description || '',
      isActive: category.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await openConfirm({
      message: 'Tem certeza que deseja excluir esta categoria?',
    });
    if (!confirmed) return;

    try {
      await categoryService.delete(id);
      notifySuccess('Categoria excluída com sucesso');
      loadData();
    } catch (error) {
      notifyError('Erro ao excluir categoria');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getTypeLabel = (type: CategoryType) => {
    return type === 'revenue' ? 'Receita' : 'Despesa';
  };

  const getTypeColor = (type: CategoryType) => {
    return type === 'revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  // Removed - categories are now created by reset-db script
  /*
  const _initializeDefaultCategories = async () => {
    const defaultCategories: CategoryFormData[] = [
      // === RECEITAS ===
      { 
        name: 'Vendas de Hambúrgueres', 
        type: 'revenue', 
        description: 'Receita bruta de vendas de hambúrgueres e combos', 
        isActive: true 
      },
      { 
        name: 'Vendas de Bebidas', 
        type: 'revenue', 
        description: 'Receita bruta de vendas de bebidas (refrigerantes, sucos, etc)', 
        isActive: true 
      },
      { 
        name: 'Vendas de Acompanhamentos', 
        type: 'revenue', 
        description: 'Receita bruta de vendas de acompanhamentos (batatas fritas, anéis de cebola, etc)', 
        isActive: true 
      },
      { 
        name: 'Delivery - Próprio', 
        type: 'revenue', 
        description: 'Receita de entregas pelo delivery próprio (sem plataformas)', 
        isActive: true 
      },
      { 
        name: 'iFood', 
        type: 'revenue', 
        description: 'Receita líquida de vendas pela plataforma iFood (após taxas)', 
        isActive: true 
      },
      { 
        name: 'Outras Plataformas', 
        type: 'revenue', 
        description: 'Receita líquida de outras plataformas de delivery (Rappi, Uber Eats, etc)', 
        isActive: true 
      },
      { 
        name: 'Vendas no Balcão', 
        type: 'revenue', 
        description: 'Receita de vendas presenciais no balcão (sem delivery)', 
        isActive: true 
      },
      { 
        name: 'Outras Receitas', 
        type: 'revenue', 
        description: 'Outras receitas não operacionais', 
        isActive: true 
      },
      
      // === DESPESAS OPERACIONAIS ===
      { 
        name: 'Custos de Mercadorias Vendidas (CMV)', 
        type: 'expense', 
        description: 'Custo dos produtos vendidos - ingredientes e insumos utilizados nas vendas', 
        isActive: true 
      },
      
      // Pessoal
      { 
        name: 'Salários e Encargos Sociais', 
        type: 'expense', 
        description: 'Salários, férias, décimo terceiro, INSS, FGTS e outros encargos trabalhistas', 
        isActive: true 
      },
      { 
        name: 'Taxa de Entregadores', 
        type: 'expense', 
        description: 'Taxa diária e repasses para entregadores', 
        isActive: true 
      },
      
      // Custos Fixos
      { 
        name: 'Aluguel e Condomínio', 
        type: 'expense', 
        description: 'Aluguel do imóvel e taxa de condomínio', 
        isActive: true 
      },
      { 
        name: 'Energia Elétrica', 
        type: 'expense', 
        description: 'Conta de energia elétrica', 
        isActive: true 
      },
      { 
        name: 'Água e Esgoto', 
        type: 'expense', 
        description: 'Conta de água e esgoto', 
        isActive: true 
      },
      { 
        name: 'Gás', 
        type: 'expense', 
        description: 'Gás de cozinha', 
        isActive: true 
      },
      { 
        name: 'Telefone e Internet', 
        type: 'expense', 
        description: 'Telefone, internet e serviços de comunicação', 
        isActive: true 
      },
      { 
        name: 'Sistema e Software', 
        type: 'expense', 
        description: 'Assinaturas de sistemas, softwares e ferramentas de gestão', 
        isActive: true 
      },
      
      // Marketing e Vendas
      { 
        name: 'Marketing e Publicidade', 
        type: 'expense', 
        description: 'Campanhas de marketing, publicidade e propaganda (redes sociais, mídia, etc)', 
        isActive: true 
      },
      { 
        name: 'Taxas de Cartão e Pagamento', 
        type: 'expense', 
        description: 'Taxas de maquininhas, processamento de pagamento (crédito, débito, PIX)', 
        isActive: true 
      },
      { 
        name: 'Taxas de Plataformas', 
        type: 'expense', 
        description: 'Taxas e comissões de plataformas de delivery (iFood, Rappi, etc)', 
        isActive: true 
      },
      
      // Fornecedores e Compras
      { 
        name: 'Compras de Insumos', 
        type: 'expense', 
        description: 'Compras de ingredientes, insumos e mercadorias para revenda', 
        isActive: true 
      },
      { 
        name: 'Embalagens', 
        type: 'expense', 
        description: 'Embalagens, sacolas e materiais descartáveis', 
        isActive: true 
      },
      { 
        name: 'Material de Limpeza', 
        type: 'expense', 
        description: 'Produtos de limpeza, higiene e sanitização', 
        isActive: true 
      },
      
      // Manutenção e Operação
      { 
        name: 'Manutenção de Equipamentos', 
        type: 'expense', 
        description: 'Manutenção preventiva e corretiva de equipamentos (fritadeiras, freezers, etc)', 
        isActive: true 
      },
      { 
        name: 'Reparos e Melhorias', 
        type: 'expense', 
        description: 'Reparos no estabelecimento e melhorias estruturais', 
        isActive: true 
      },
      
      // Impostos e Tributos
      { 
        name: 'Impostos e Taxas', 
        type: 'expense', 
        description: 'Impostos, taxas e contribuições (ISS, ICMS, Simples Nacional, etc)', 
        isActive: true 
      },
      
      // Outros
      { 
        name: 'Despesas Administrativas', 
        type: 'expense', 
        description: 'Honorários contábeis, serviços bancários, taxas administrativas', 
        isActive: true 
      },
      { 
        name: 'Frete e Transporte', 
        type: 'expense', 
        description: 'Frete de compras, transporte de mercadorias', 
        isActive: true 
      },
      { 
        name: 'Seguros', 
        type: 'expense', 
        description: 'Seguros diversos (estabelecimento, equipamentos, etc)', 
        isActive: true 
      },
      { 
        name: 'Outras Despesas Operacionais', 
        type: 'expense', 
        description: 'Outras despesas operacionais não categorizadas', 
        isActive: true 
      },
    ];

    try {
      const existing = await categoryService.getAll();
      if (existing.length > 0) {
        const confirmed = await openConfirm({
          message: 'Já existem categorias cadastradas. Deseja adicionar as categorias padrão mesmo assim?',
        });
        if (!confirmed) return;
      }

      for (const category of defaultCategories) {
        await categoryService.create(category);
      }
      notifySuccess('Categorias padrão criadas com sucesso');
      loadData();
    } catch (error) {
      notifyError('Erro ao criar categorias padrão');
    }
  };
  */

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Categorias Financeiras</h1>
            <p className="mt-2 text-gray-600">Gerencie categorias de receitas e despesas para DRE</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <div className="text-sm text-green-700 flex items-center gap-2">
              <MdTrendingUp className="w-4 h-4" />
              Receitas
            </div>
            <div className="text-2xl font-bold text-green-900">{stats.revenues}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <div className="text-sm text-red-700 flex items-center gap-2">
              <MdTrendingDown className="w-4 h-4" />
              Despesas
            </div>
            <div className="text-2xl font-bold text-red-900">{stats.expenses}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="all">Todos os tipos</option>
                <option value="revenue">Receitas</option>
                <option value="expense">Despesas</option>
              </select>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                setFormData({
                  name: '',
                  type: 'expense',
                  description: '',
                  isActive: true,
                });
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <MdAdd className="w-5 h-5" />
              Nova Categoria
            </button>
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {editingId ? 'Editar Categoria' : 'Nova Categoria'}
                </h2>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as CategoryType })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="expense">Despesa</option>
                        <option value="revenue">Receita</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Descrição (opcional)</label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Descreva o propósito desta categoria..."
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Categoria Ativa</span>
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                        setFormData({
                          name: '',
                          type: 'expense',
                          description: '',
                          isActive: true,
                        });
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {editingId ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Nome
                      {sortField === 'name' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center gap-2">
                      Tipo
                      {sortField === 'type' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('isActive')}
                  >
                    <div className="flex items-center justify-center gap-2">
                      Status
                      {sortField === 'isActive' && <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedCategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma categoria encontrada
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedCategories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{category.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(category.type)}`}
                        >
                          {getTypeLabel(category.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">{category.description || '—'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {category.isActive ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Ativa
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Inativa
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Editar"
                          >
                            <MdEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <MdDelete className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

