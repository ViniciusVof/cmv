import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { stockService } from '../services/stockService';
import { ingredientService } from '../services/ingredientService';
import { businessSettingsService } from '../services/businessSettingsService';
import { orderService } from '../services/orderService';
import type { StockMovement } from '../types/stock';
import type { Ingredient } from '../types/ingredient';
import { MdCalendarToday, MdRefresh } from 'react-icons/md';

type PeriodPreset = 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

export function GlobalCMV() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [summaryMap, setSummaryMap] = useState<Record<string, { quantityOnHand: number; lastEntryUnitCost?: number }>>({});
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<PeriodPreset>('thisMonth');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [businessMethod, setBusinessMethod] = useState<'current' | 'monthly_average'>('current');
  const [ordersTotal, setOrdersTotal] = useState<number>(0);
  const [sortField, setSortField] = useState<'name' | 'qty' | 'unitCost' | 'total' | 'share' | 'cmvInsumo'>('total');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [tableFilter, setTableFilter] = useState<'none' | 'top5' | 'pareto80'>('none');

  const SortIcon = ({ field }: { field: 'name' | 'qty' | 'unitCost' | 'total' | 'share' | 'cmvInsumo' }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M7 7l3-3 3 3H7zm6 6l-3 3-3-3h6z" clipRule="evenodd" />
        </svg>
      );
    }
    return sortDir === 'asc' ? (
      <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 6l4 4H6l4-4z" clipRule="evenodd" />
      </svg>
    ) : (
      <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 14l-4-4h8l-4 4z" clipRule="evenodd" />
      </svg>
    );
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  useEffect(() => {
    const initRange = () => {
      const now = new Date();
      if (preset === 'thisMonth') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        setFromDate(start.toISOString().slice(0, 10));
        setToDate(now.toISOString().slice(0, 10));
      } else if (preset === 'lastMonth') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        setFromDate(start.toISOString().slice(0, 10));
        setToDate(end.toISOString().slice(0, 10));
      } else if (preset === 'last7') {
        const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        setFromDate(start.toISOString().slice(0, 10));
        setToDate(now.toISOString().slice(0, 10));
      }
    };
    initRange();
  }, [preset]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [movs, ings, sum, bs] = await Promise.all([
          stockService.getAll(),
          ingredientService.getAll(),
          stockService.getSummaryAll(),
          businessSettingsService.get(),
        ]);
        setMovements(movs);
        setIngredients(ings);
        const map: Record<string, { quantityOnHand: number; lastEntryUnitCost?: number }> = {};
        Object.values(sum).forEach((s: any) => { map[s.ingredientId] = { quantityOnHand: s.quantityOnHand, lastEntryUnitCost: s.lastEntryUnitCost }; });
        setSummaryMap(map);
        setBusinessMethod(bs.costCalculationMethod || 'current');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // load orders total for the period
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await orderService.getAll();
        const start = fromDate ? new Date(fromDate + 'T00:00:00') : null;
        const end = toDate ? new Date(toDate + 'T23:59:59') : null;
        const inRange = data.filter(o => {
          const d = new Date(o.createdAt as any);
          if (start && d < start) return false;
          if (end && d > end) return false;
          return o.status === 'completed';
        });
        setOrdersTotal(inRange.reduce((s, o) => s + (o.total || 0), 0));
      } catch {
        setOrdersTotal(0);
      }
    };
    if (fromDate && toDate) loadOrders();
  }, [fromDate, toDate]);

  const result = useMemo(() => {
    if (!fromDate || !toDate) return { cost: 0, items: [] as any[], cmv: 0 };
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T23:59:59');

    const outs = movements.filter(m => m.type === 'OUT' && new Date(m.date) >= start && new Date(m.date) <= end);

    // aggregate by ingredient
    const byIng: Record<string, { ingredientId: string; name: string; unit: string; qty: number; unitCost: number; total: number }>
      = {};

    outs.forEach(m => {
      const ing = ingredients.find(i => String(i.id) === String(m.ingredientId));
      const sum = summaryMap[String(m.ingredientId)];
      const baseUnitCost = businessMethod === 'monthly_average' ? (sum?.lastEntryUnitCost ?? ing?.finalValue ?? 0) : (sum?.lastEntryUnitCost ?? ing?.finalValue ?? 0);
      const unitCost = Number(baseUnitCost) || 0;
      const total = (Number(m.quantity) || 0) * unitCost;
      const key = String(m.ingredientId);
      if (!byIng[key]) byIng[key] = { ingredientId: key, name: ing?.name || key, unit: ing?.unit || '', qty: 0, unitCost: 0, total: 0 };
      byIng[key].qty += Number(m.quantity) || 0;
      // weighted avg unit cost
      const prevTotal = byIng[key].total;
      byIng[key].total = prevTotal + total;
      byIng[key].unitCost = byIng[key].qty > 0 ? byIng[key].total / byIng[key].qty : unitCost;
    });

    const itemsRaw = Object.values(byIng);
    const cost = itemsRaw.reduce((s, it) => s + it.total, 0);
    const cmv = ordersTotal > 0 ? cost / ordersTotal : 0;
    // enrich with metrics for sorting and insights
    const items = itemsRaw.map(it => ({
      ...it,
      share: cost > 0 ? it.total / cost : 0,
      cmvInsumo: ordersTotal > 0 ? it.total / ordersTotal : 0,
    }));
    const itemsForInsights = [...items].sort((a, b) => b.total - a.total);
    // sorting
    const valueOf = (x: any) =>
      sortField === 'name' ? x.name :
      sortField === 'qty' ? x.qty :
      sortField === 'unitCost' ? x.unitCost :
      sortField === 'share' ? x.share :
      sortField === 'cmvInsumo' ? x.cmvInsumo : x.total;
    items.sort((a: any, b: any) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va === vb) return 0;
      return (va > vb ? 1 : -1) * (sortDir === 'asc' ? 1 : -1);
    });
    return { cost, items, cmv, insightsBase: itemsForInsights } as any;
  }, [movements, ingredients, summaryMap, fromDate, toDate, businessMethod, ordersTotal, sortField, sortDir]);

  const filteredIds = useMemo(() => {
    const base: any[] = (result as any).insightsBase || [];
    if (tableFilter === 'top5') {
      return new Set(base.slice(0, 5).map((x) => String(x.ingredientId)));
    }
    if (tableFilter === 'pareto80') {
      const ids: string[] = [];
      let acc = 0;
      for (const it of base) {
        if (acc >= 0.8) break;
        acc += it.share;
        ids.push(String(it.ingredientId));
      }
      return new Set(ids);
    }
    return null;
  }, [result, tableFilter]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64 text-gray-600">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 w-full max-w-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">CMV Global</h1>
            <p className="text-gray-600">Consumo do estoque e CMV por período</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Período</label>
              <select value={preset} onChange={(e) => setPreset(e.target.value as PeriodPreset)} className="w-full px-3 py-2 border rounded-lg">
                <option value="last7">Últimos 7 dias</option>
                <option value="thisMonth">Este mês</option>
                <option value="lastMonth">Mês passado</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">De</label>
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPreset('custom'); }} className="w-full px-3 py-2 border rounded-lg"/>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Até</label>
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPreset('custom'); }} className="w-full px-3 py-2 border rounded-lg"/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPreset('thisMonth')} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"><MdCalendarToday className="w-4 h-4"/>Este mês</button>
              <button onClick={() => setPreset('last7')} className="px-4 py-2 border rounded-lg hover:bg-gray-50 flex items-center gap-2"><MdRefresh className="w-4 h-4"/>7 dias</button>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Custo Consumido</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(result.cost)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Vendas (Pedidos concluídos)</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(ordersTotal)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">CMV Global</div>
            <div className={`text-2xl font-bold ${result.cmv > 0.35 ? 'text-red-600' : 'text-green-700'}`}>{(result.cmv * 100).toFixed(2)}%</div>
          </div>
        </div>

        {/* Insights (sempre baseados na ordem por custo total, não no sort da tabela) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(() => {
            const base = (result as any).insightsBase || [];
            const top = base[0];
            const topShare = top ? (top.share * 100).toFixed(2) : '0.00';
            let cumulative = 0;
            let count80 = 0;
            for (const it of base) {
              if (cumulative < 0.8) {
                cumulative += it.share;
                count80 += 1;
              }
            }
            const cumTop5 = base.slice(0, 5).reduce((s: number, it: any) => s + it.share, 0);
            return (
              <>
                <button onClick={() => setTableFilter('top5')} className="bg-white rounded-lg shadow p-4 text-left hover:bg-gray-50 transition-colors">
                  <div className="text-sm text-gray-500">Maior contribuição</div>
                  <div className="text-sm text-gray-800 mt-1">{top ? top.name : '—'}</div>
                  <div className="text-2xl font-bold text-gray-900">{topShare}%</div>
                  <div className="text-xs text-blue-600 mt-2">Clique para ver Top 5</div>
                </button>
                <button onClick={() => setTableFilter('top5')} className="bg-white rounded-lg shadow p-4 text-left hover:bg-gray-50 transition-colors">
                  <div className="text-sm text-gray-500">Top 5 cobertura</div>
                  <div className="text-2xl font-bold text-gray-900">{(cumTop5 * 100).toFixed(2)}%</div>
                  <div className="text-xs text-gray-500 mt-1">Participação dos 5 maiores</div>
                  <div className="text-xs text-blue-600 mt-2">Clique para filtrar Top 5</div>
                </button>
                <button onClick={() => setTableFilter('pareto80')} className="bg-white rounded-lg shadow p-4 text-left hover:bg-gray-50 transition-colors">
                  <div className="text-sm text-gray-500">Regra 80/20</div>
                  <div className="text-2xl font-bold text-gray-900">{count80} insumo(s)</div>
                  <div className="text-xs text-gray-500 mt-1">Qtd. de insumos que somam ~80% do custo</div>
                  <div className="text-xs text-blue-600 mt-2">Clique para filtrar 80/20</div>
                </button>
              </>
            );
          })()}
        </div>

        {/* Detalhe por ingrediente */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b"><h2 className="text-lg font-semibold text-gray-800">Consumo por Insumo</h2></div>
          <div className="overflow-x-auto">
            {tableFilter !== 'none' && (
              <div className="px-4 py-2 text-sm text-gray-600 flex items-center gap-3">
                <span>Filtro ativo: {tableFilter === 'top5' ? 'Top 5' : 'Regra 80/20'}</span>
                <button onClick={() => setTableFilter('none')} className="px-2 py-1 border rounded hover:bg-gray-50">Limpar filtro</button>
              </div>
            )}
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    <button onClick={() => { setSortField('name'); setSortDir(sortField === 'name' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="hover:text-gray-700 flex items-center gap-1">Insumo <SortIcon field="name"/></button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    <button onClick={() => { setSortField('qty'); setSortDir(sortField === 'qty' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="hover:text-gray-700 inline-flex items-center gap-1">Qtd <SortIcon field="qty"/></button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    <button onClick={() => { setSortField('unitCost'); setSortDir(sortField === 'unitCost' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="hover:text-gray-700 inline-flex items-center gap-1">Custo Unit. <SortIcon field="unitCost"/></button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    <button onClick={() => { setSortField('total'); setSortDir(sortField === 'total' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="hover:text-gray-700 inline-flex items-center gap-1">Custo Total <SortIcon field="total"/></button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    <button onClick={() => { setSortField('share'); setSortDir(sortField === 'share' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="hover:text-gray-700 inline-flex items-center gap-1">Participação <SortIcon field="share"/></button>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    <button onClick={() => { setSortField('cmvInsumo'); setSortDir(sortField === 'cmvInsumo' && sortDir === 'asc' ? 'desc' : 'asc'); }} className="hover:text-gray-700 inline-flex items-center gap-1">CMV do Insumo <SortIcon field="cmvInsumo"/></button>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {result.items.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Sem saídas no período</td></tr>
                ) : (
                  result.items
                    .filter((it: any) => !filteredIds || filteredIds.has(String(it.ingredientId)))
                    .map((it: any) => {
                    const share = result.cost > 0 ? (it.total / result.cost) : 0;
                    const insumoCMV = ordersTotal > 0 ? (it.total / ordersTotal) : 0;
                    return (
                    <tr key={it.ingredientId}>
                      <td className="px-6 py-3 text-sm text-gray-800">{it.name}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-800">{it.qty.toFixed(3)} {it.unit}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-800">{formatCurrency(it.unitCost)}</td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(it.total)}</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-800">{(share * 100).toFixed(2)}%</td>
                      <td className="px-6 py-3 text-right text-sm text-gray-800">{(insumoCMV * 100).toFixed(2)}%</td>
                    </tr>
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

export default GlobalCMV;


