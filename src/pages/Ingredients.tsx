import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { CorrectionFactorCalculator } from '../components/CorrectionFactorCalculator';
import type { Ingredient, IngredientFormData } from '../types/ingredient';
import type { Supplier } from '../types/supplier';
import { ingredientService } from '../services/ingredientService';
import { supplierService } from '../services/supplierService';
import { stockService } from '../services/stockService';
import type { StockMovementType, StockMovement } from '../types/stock';
import { MdAdd, MdRemove, MdDelete, MdExpandMore, MdExpandLess } from 'react-icons/md';

type SortField = 'code' | 'name' | 'pricePaid' | 'volume' | 'unit' | 'correctionFactor' | 'finalValue' | 'supplierName';
type SortDirection = 'asc' | 'desc';

export function Ingredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [stockSummaries, setStockSummaries] = useState<Record<string, { quantityOnHand: number; lastEntryUnitCost?: number }>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<IngredientFormData>({
    code: '',
    name: '',
    pricePaid: 0,
    volume: 0,
    unit: 'KG',
    correctionFactor: 1.0,
    supplierId: '',
  });
  const [supplierInput, setSupplierInput] = useState('');
  const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showCalculator, setShowCalculator] = useState(false);
  const [expandedIngredientId, setExpandedIngredientId] = useState<string | null>(null);
  const [ingredientMovements, setIngredientMovements] = useState<Record<string, StockMovement[]>>({});
  const [showMovementForm, setShowMovementForm] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<StockMovementType>('IN');
  const [movementQuantity, setMovementQuantity] = useState<number>(0);
  const [movementUnitCost, setMovementUnitCost] = useState<number>(0);
  const [movementDate, setMovementDate] = useState<string>('');
  const [isInitialMovement, setIsInitialMovement] = useState<boolean>(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calculate final value for display
  const calculateFinalValue = (pricePaid: number, volume: number, correctionFactor: number) => {
    if (volume === 0) return 0;
    return (pricePaid / volume) * correctionFactor;
  };

  // Filter and sort ingredients
  const filteredAndSortedIngredients = useMemo(() => {
    let filtered = ingredients;

    // Apply search filter
    if (searchTerm) {
      filtered = ingredients.filter((ingredient) =>
        ingredient.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case 'code':
          aValue = a.code.toLowerCase();
          bValue = b.code.toLowerCase();
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'pricePaid':
          aValue = a.pricePaid;
          bValue = b.pricePaid;
          break;
        case 'volume':
          aValue = a.volume;
          bValue = b.volume;
          break;
        case 'unit':
          aValue = a.unit.toLowerCase();
          bValue = b.unit.toLowerCase();
          break;
        case 'correctionFactor':
          aValue = a.correctionFactor;
          bValue = b.correctionFactor;
          break;
        case 'finalValue':
          aValue = a.finalValue || 0;
          bValue = b.finalValue || 0;
          break;
        case 'supplierName':
          aValue = a.supplierName.toLowerCase();
          bValue = b.supplierName.toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [ingredients, searchTerm, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  // Generate next code automatically
  const generateNextCode = useMemo(() => {
    if (ingredients.length === 0) return '1';
    const codes = ingredients.map((ing) => parseInt(ing.code)).filter((code) => !isNaN(code));
    if (codes.length === 0) return '1';
    const maxCode = Math.max(...codes);
    return (maxCode + 1).toString();
  }, [ingredients]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ingredientsData, suppliersData, stockMap] = await Promise.all([
        ingredientService.getAll(),
        supplierService.getAll(),
        stockService.getSummaryAll(),
      ]);
      
      // Criar movimentações iniciais para ingredientes que têm volume mas não têm movimentações
      for (const ingredient of ingredientsData) {
        const movements = await stockService.getByIngredient(ingredient.id);
        const stockSummary = stockMap[ingredient.id];
        const hasMovements = movements.length > 0;
        const volumeFromMovements = stockSummary ? stockSummary.quantityOnHand : 0;
        
        // Se o ingrediente tem volume original mas não tem movimentações registradas,
        // ou se o volume original é diferente da soma das movimentações (e é maior que zero),
        // criar movimentação inicial
        if (ingredient.volume > 0 && (!hasMovements || (volumeFromMovements === 0 && ingredient.volume > 0))) {
          try {
            const unitCost = ingredient.pricePaid && ingredient.volume > 0 
              ? ingredient.pricePaid / ingredient.volume 
              : 0;
            
            await stockService.create({
              ingredientId: ingredient.id,
              type: 'IN',
              quantity: ingredient.volume,
              unitCost: unitCost,
              isInitial: true,
            });
          } catch (error) {
            console.error(`Error creating initial movement for ingredient ${ingredient.id}:`, error);
          }
        }
      }
      
      // Recarregar resumo de estoque após criar movimentações iniciais
      const updatedStockMap = await stockService.getSummaryAll();
      
      // Atualizar volumes dos ingredientes baseado nas movimentações (soma de todas)
      const updatedIngredients = ingredientsData.map((ingredient) => {
        const stockSummary = updatedStockMap[ingredient.id];
        // O volume sempre reflete a soma das movimentações
        const calculatedVolume = stockSummary ? stockSummary.quantityOnHand : 0;
        return {
          ...ingredient,
          volume: calculatedVolume,
        };
      });
      
      setIngredients(updatedIngredients);
      setSuppliers(suppliersData);
      const summaries: Record<string, { quantityOnHand: number; lastEntryUnitCost?: number }> = {};
      Object.values(updatedStockMap).forEach((s: any) => {
        summaries[s.ingredientId] = { quantityOnHand: s.quantityOnHand, lastEntryUnitCost: s.lastEntryUnitCost };
      });
      setStockSummaries(summaries);
      
      // Load movements for expanded ingredient if any
      if (expandedIngredientId) {
        const movements = await stockService.getByIngredient(expandedIngredientId);
        setIngredientMovements(prev => ({ ...prev, [expandedIngredientId]: movements }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMovementsForIngredient = async (ingredientId: string) => {
    try {
      const movements = await stockService.getByIngredient(ingredientId);
      setIngredientMovements(prev => ({ ...prev, [ingredientId]: movements }));
    } catch (error) {
      console.error('Error loading movements:', error);
    }
  };

  const toggleExpanded = async (ingredientId: string) => {
    if (expandedIngredientId === ingredientId) {
      setExpandedIngredientId(null);
      setShowMovementForm(null);
    } else {
      setExpandedIngredientId(ingredientId);
      if (!ingredientMovements[ingredientId]) {
        await loadMovementsForIngredient(ingredientId);
      }
      setShowMovementForm(null);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update code when showing form for new ingredient
  useEffect(() => {
    if (showForm && !editingId) {
      setFormData((prev) => ({
        ...prev,
        code: generateNextCode,
      }));
    }
  }, [showForm, editingId, generateNextCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Ensure supplier exists before submitting
      let finalSupplierId = formData.supplierId;
      
      if (!finalSupplierId && supplierInput.trim()) {
        // Check if supplier exists by name
        const existing = suppliers.find(
          (s) => s.name.toLowerCase() === supplierInput.toLowerCase()
        );
        
        if (existing) {
          finalSupplierId = existing.id;
        } else {
          // Create new supplier
          const newSupplier = await supplierService.create({
            name: supplierInput.trim(),
          });
          finalSupplierId = newSupplier.id;
          // Reload suppliers list
          const updatedSuppliers = await supplierService.getAll();
          setSuppliers(updatedSuppliers);
        }
      }

      if (!finalSupplierId) {
        alert('Por favor, selecione ou crie um fornecedor');
        return;
      }

      const finalFormData = {
        ...formData,
        supplierId: finalSupplierId,
      };

      let createdIngredient;
      if (editingId) {
        createdIngredient = await ingredientService.update(editingId, finalFormData);
      } else {
        createdIngredient = await ingredientService.create(finalFormData);
        
        // Criar movimentação inicial se o volume for maior que zero
        if (finalFormData.volume > 0) {
          const unitCost = finalFormData.pricePaid / finalFormData.volume;
          await stockService.create({
            ingredientId: createdIngredient.id,
            type: 'IN',
            quantity: finalFormData.volume,
            unitCost: unitCost,
            isInitial: true,
          });
        }
      }
      setShowForm(false);
      setEditingId(null);
      setSupplierInput('');
      setShowSupplierSuggestions(false);
      setFormData({
        code: generateNextCode,
        name: '',
        pricePaid: 0,
        volume: 0,
        unit: 'KG',
        correctionFactor: 1.0,
        supplierId: '',
      });
      loadData();
    } catch (error) {
      console.error('Error saving ingredient:', error);
      alert('Erro ao salvar insumo');
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setFormData({
      code: ingredient.code,
      name: ingredient.name,
      pricePaid: ingredient.pricePaid,
      volume: ingredient.volume,
      unit: ingredient.unit,
      correctionFactor: ingredient.correctionFactor,
      supplierId: ingredient.supplierId,
    });
    setSupplierInput(ingredient.supplierName);
    setEditingId(ingredient.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este insumo?')) {
      return;
    }
    try {
      await ingredientService.delete(id);
      loadData();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      alert('Erro ao excluir insumo');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setSupplierInput('');
    setShowSupplierSuggestions(false);
    setFormData({
      code: '',
      name: '',
      pricePaid: 0,
      volume: 0,
      unit: 'KG',
      correctionFactor: 1.0,
      supplierId: '',
    });
  };

  // Calculate final value for form preview
  const previewFinalValue = useMemo(() => {
    return calculateFinalValue(formData.pricePaid, formData.volume, formData.correctionFactor);
  }, [formData.pricePaid, formData.volume, formData.correctionFactor]);

  // Filter suppliers for autocomplete
  const filteredSuppliers = useMemo(() => {
    if (!supplierInput.trim()) return suppliers.slice(0, 5);
    return suppliers
      .filter((supplier) =>
        supplier.name.toLowerCase().includes(supplierInput.toLowerCase())
      )
      .slice(0, 5);
  }, [suppliers, supplierInput]);

  // Handle supplier selection or creation
  const handleSupplierSelect = async (supplier: Supplier | null) => {
    if (supplier) {
      setFormData({ ...formData, supplierId: supplier.id });
      setSupplierInput(supplier.name);
      setShowSupplierSuggestions(false);
    } else if (supplierInput.trim()) {
      // Create new supplier
      try {
        const newSupplier = await supplierService.create({
          name: supplierInput.trim(),
        });
        setFormData({ ...formData, supplierId: newSupplier.id });
        setSupplierInput(newSupplier.name);
        setShowSupplierSuggestions(false);
        // Reload suppliers list
        const updatedSuppliers = await supplierService.getAll();
        setSuppliers(updatedSuppliers);
      } catch (error) {
        console.error('Error creating supplier:', error);
        alert('Erro ao criar fornecedor');
      }
    }
  };

  const handleSupplierInputChange = (value: string) => {
    setSupplierInput(value);
    setShowSupplierSuggestions(true);
    // If we have an exact match, auto-select it
    const exactMatch = suppliers.find(
      (s) => s.name.toLowerCase() === value.toLowerCase()
    );
    if (exactMatch) {
      setFormData({ ...formData, supplierId: exactMatch.id });
    } else {
      setFormData({ ...formData, supplierId: '' });
    }
  };

  const handleSupplierInputBlur = () => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      setShowSupplierSuggestions(false);
      // If supplier exists by name, select it, otherwise create new one
      if (supplierInput.trim() && !formData.supplierId) {
        const existing = suppliers.find(
          (s) => s.name.toLowerCase() === supplierInput.toLowerCase()
        );
        if (existing) {
          setFormData({ ...formData, supplierId: existing.id });
        } else {
          handleSupplierSelect(null);
        }
      }
    }, 200);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Carregando...</div>
        </div>
      </Layout>
    );
  }

  const handleApplyCorrectionFactor = (factor: number) => {
    setFormData({ ...formData, correctionFactor: factor });
  };

  const openMovementForm = (ingredientId: string) => {
    // Determine if initial movement (no movements recorded for this ingredient)
    const isInitial = !stockSummaries[ingredientId] || (stockSummaries[ingredientId]?.quantityOnHand === 0 && !ingredientMovements[ingredientId]?.length);
    setIsInitialMovement(isInitial);
    setMovementType('IN');
    setMovementQuantity(0);
    setMovementUnitCost(0);
    setMovementDate('');
    setShowMovementForm(ingredientId);
  };

  const cancelMovementForm = () => {
    setShowMovementForm(null);
    setMovementType('IN');
    setMovementQuantity(0);
    setMovementUnitCost(0);
    setMovementDate('');
    setIsInitialMovement(false);
  };

  const submitMovement = async (ingredientId: string) => {
    if (movementQuantity <= 0) {
      alert('Informe uma quantidade válida');
      return;
    }
    if (movementType === 'IN' && movementUnitCost <= 0) {
      alert('Informe o custo unitário da entrada');
      return;
    }

    try {
      // Criar a movimentação
      await stockService.create({
        ingredientId,
        type: movementType,
        quantity: movementQuantity,
        unitCost: movementType === 'IN' ? movementUnitCost : undefined,
        isInitial: isInitialMovement || undefined,
        date: movementDate || undefined,
      });
      
      // Recarregar o resumo de estoque e atualizar volume do ingrediente
      const stockMap = await stockService.getSummaryAll();
      const stockSummary = stockMap[ingredientId];
      const summaries: Record<string, { quantityOnHand: number; lastEntryUnitCost?: number }> = {};
      Object.values(stockMap).forEach((s: any) => {
        summaries[s.ingredientId] = { quantityOnHand: s.quantityOnHand, lastEntryUnitCost: s.lastEntryUnitCost };
      });
      setStockSummaries(summaries);
      
      // Atualizar o volume do ingrediente no banco para manter consistência
      if (stockSummary) {
        const ingredient = ingredients.find(i => i.id === ingredientId);
        if (ingredient && ingredient.volume !== stockSummary.quantityOnHand) {
          await ingredientService.update(ingredientId, {
            code: ingredient.code,
            name: ingredient.name,
            pricePaid: ingredient.pricePaid,
            volume: stockSummary.quantityOnHand,
            unit: ingredient.unit,
            correctionFactor: ingredient.correctionFactor,
            supplierId: ingredient.supplierId,
          });
        }
      }
      
      cancelMovementForm();
      await loadMovementsForIngredient(ingredientId);
      await loadData(); // Recarrega todos os dados - o volume será calculado baseado nas movimentações
    } catch (error) {
      console.error('Error creating stock movement:', error);
      alert('Erro ao registrar movimentação de estoque');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      {/* Floating Action Button for Calculator */}
      <button
        onClick={() => setShowCalculator(true)}
        className="fixed bottom-8 right-8 z-40 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 transition-all hover:scale-110 flex items-center justify-center"
        title="Calculadora de Fator de Correção"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      </button>

      {/* Calculator Modal */}
      <CorrectionFactorCalculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
        onApply={handleApplyCorrectionFactor}
      />

      <div className="space-y-6 w-full max-w-full">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Estoque / Insumos</h1>
            <p className="text-gray-600">Cadastro de insumos e controle de estoque</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Insumo
          </button>
        </div>

        {/* Insights */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total de Insumos</div>
            <div className="text-2xl font-bold text-gray-900">{ingredients.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Valor Final Médio</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(ingredients.length ? (ingredients.reduce((s, i) => s + (i.finalValue || 0), 0) / ingredients.length) : 0)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Mais Caro (R$ Final)</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(Math.max(0, ...ingredients.map(i => i.finalValue || 0)))}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Fornecedores Únicos</div>
            <div className="text-2xl font-bold text-gray-900">{new Set(ingredients.map(i => i.supplierId)).size}</div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              {editingId ? 'Editar Insumo' : 'Novo Insumo'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Produto *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    R$ Pago *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.pricePaid || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricePaid: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Volume *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.volume || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        volume: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Un. Medida *
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="KG">KG</option>
                    <option value="UN">UN</option>
                    <option value="LT">LT</option>
                    <option value="CX">CX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fator de Correção *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.correctionFactor || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          correctionFactor: parseFloat(e.target.value) || 1.0,
                        })
                      }
                      required
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCalculator(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      title="Calculadora de Fator de Correção"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      Calcular
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fornecedor *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={supplierInput}
                      onChange={(e) => handleSupplierInputChange(e.target.value)}
                      onFocus={() => setShowSupplierSuggestions(true)}
                      onBlur={handleSupplierInputBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && filteredSuppliers.length > 0) {
                          e.preventDefault();
                          handleSupplierSelect(filteredSuppliers[0]);
                        } else if (e.key === 'Enter' && supplierInput.trim()) {
                          e.preventDefault();
                          handleSupplierSelect(null);
                        } else if (e.key === 'Escape') {
                          setShowSupplierSuggestions(false);
                        }
                      }}
                      required
                      placeholder="Digite ou selecione um fornecedor..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                    {showSupplierSuggestions && filteredSuppliers.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                        {filteredSuppliers.map((supplier) => (
                          <button
                            key={supplier.id}
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSupplierSelect(supplier);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                          >
                            <div className="font-medium text-gray-900">{supplier.name}</div>
                            {supplier.email && (
                              <div className="text-xs text-gray-500">{supplier.email}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {showSupplierSuggestions &&
                      supplierInput.trim() &&
                      filteredSuppliers.length === 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              handleSupplierSelect(null);
                            }}
                            className="w-full px-4 py-2 text-left hover:bg-green-50 focus:bg-green-50 focus:outline-none transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-5 h-5 text-green-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                              <span className="font-medium text-gray-900">
                                Criar "{supplierInput.trim()}"
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Pressione Enter para criar
                            </div>
                          </button>
                        </div>
                      )}
                  </div>
                  {!formData.supplierId && supplierInput.trim() && (
                    <p className="mt-1 text-xs text-gray-500">
                      Fornecedor será criado automaticamente se não existir
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Valor Final (R$):</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(previewFinalValue)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Calculado: (R$ Pago ÷ Volume) × Fator de Correção
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, produto ou fornecedor..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <svg
                className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Limpar
              </button>
            )}
            <div className="text-sm text-gray-600">
              {filteredAndSortedIngredients.length} de {ingredients.length} insumo{filteredAndSortedIngredients.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full" style={{ minWidth: 'max-content' }}>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('code')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      Cód
                      <SortIcon field="code" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      Produto
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('pricePaid')}
                      className="flex items-center gap-2 ml-auto hover:text-gray-700 transition-colors"
                    >
                      R$ Pago
                      <SortIcon field="pricePaid" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('volume')}
                      className="flex items-center gap-2 ml-auto hover:text-gray-700 transition-colors"
                    >
                      Volume
                      <SortIcon field="volume" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('unit')}
                      className="flex items-center gap-2 mx-auto hover:text-gray-700 transition-colors"
                    >
                      Un.
                      <SortIcon field="unit" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('correctionFactor')}
                      className="flex items-center gap-2 mx-auto hover:text-gray-700 transition-colors"
                    >
                      FAT.C
                      <SortIcon field="correctionFactor" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('finalValue')}
                      className="flex items-center gap-2 ml-auto hover:text-gray-700 transition-colors"
                    >
                      Valor Final R$
                      <SortIcon field="finalValue" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    <button
                      onClick={() => handleSort('supplierName')}
                      className="flex items-center gap-2 hover:text-gray-700 transition-colors"
                    >
                      Fornecedor
                      <SortIcon field="supplierName" />
                    </button>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedIngredients.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm
                        ? 'Nenhum insumo encontrado.'
                        : 'Nenhum insumo cadastrado.'}
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedIngredients.map((ingredient) => {
                    const isExpanded = expandedIngredientId === ingredient.id;
                    const movements = ingredientMovements[ingredient.id] || [];
                    const showFormForMovement = showMovementForm === ingredient.id;
                    
                    return (
                      <>
                        <tr key={ingredient.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{ingredient.code}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleExpanded(ingredient.id)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                                title={isExpanded ? 'Recolher' : 'Expandir'}
                              >
                                {isExpanded ? (
                                  <MdExpandLess className="w-5 h-5" />
                                ) : (
                                  <MdExpandMore className="w-5 h-5" />
                                )}
                              </button>
                              <div className="text-sm font-medium text-gray-900">{ingredient.name}</div>
                            </div>
                          </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{formatCurrency(ingredient.pricePaid)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm text-gray-900">{ingredient.volume}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{ingredient.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{ingredient.correctionFactor.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(ingredient.finalValue || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{ingredient.supplierName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(ingredient)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(ingredient.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <MdDelete className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-4">
                            {/* Header do Submenu */}
                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-semibold text-gray-800">Movimentações de Estoque</h3>
                              <button
                                onClick={() => openMovementForm(ingredient.id)}
                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                <MdAdd className="w-5 h-5" />
                                Nova Movimentação
                              </button>
                            </div>

                            {/* Formulário de Nova Movimentação */}
                            {showFormForMovement && (
                              <div className="bg-white border border-gray-200 rounded-lg p-4">
                                <h4 className="text-md font-semibold text-gray-800 mb-4">Nova Movimentação</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo *</label>
                                    <select
                                      value={movementType}
                                      onChange={(e) => setMovementType(e.target.value as StockMovementType)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    >
                                      <option value="IN">Entrada</option>
                                      <option value="OUT">Saída</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantidade *</label>
                                    <input
                                      type="number"
                                      step="0.001"
                                      min="0"
                                      value={movementQuantity || ''}
                                      onChange={(e) => setMovementQuantity(parseFloat(e.target.value) || 0)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                    />
                                  </div>
                                  {movementType === 'IN' && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Custo Unitário (R$) *</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          value={movementUnitCost || ''}
                                          onChange={(e) => setMovementUnitCost(parseFloat(e.target.value) || 0)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Data de Entrada (opcional)</label>
                                        <input
                                          type="date"
                                          value={movementDate}
                                          onChange={(e) => setMovementDate(e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Se não informado, será usada a data atual.</p>
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                  <button
                                    onClick={cancelMovementForm}
                                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                                  >
                                    <MdRemove className="w-4 h-4" />
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => submitMovement(ingredient.id)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                                  >
                                    <MdAdd className="w-4 h-4" />
                                    Salvar
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Histórico de Movimentações */}
                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="bg-gray-100">
                                  <tr>
                                    <th className="px-4 py-2 text-left">Data</th>
                                    <th className="px-4 py-2 text-left">Tipo</th>
                                    <th className="px-4 py-2 text-right">Quantidade</th>
                                    <th className="px-4 py-2 text-right">Custo Unitário</th>
                                    <th className="px-4 py-2 text-right">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {movements.length === 0 ? (
                                    <tr>
                                      <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                                        Nenhuma movimentação registrada
                                      </td>
                                    </tr>
                                  ) : (
                                    movements
                                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                      .map((movement) => (
                                        <tr key={movement.id} className="border-t hover:bg-gray-50">
                                          <td className="px-4 py-2">{formatDate(movement.date)}</td>
                                          <td className="px-4 py-2">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                              movement.type === 'IN' 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-red-100 text-red-800'
                                            }`}>
                                              {movement.type === 'IN' ? 'Entrada' : 'Saída'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            {movement.type === 'IN' ? '+' : '-'}{movement.quantity} {ingredient.unit}
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            {movement.unitCost ? formatCurrency(movement.unitCost) : '-'}
                                          </td>
                                          <td className="px-4 py-2 text-right">
                                            {movement.unitCost ? formatCurrency(movement.unitCost * movement.quantity) : '-'}
                                          </td>
                                        </tr>
                                      ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

