import type { DRESummary, DREItem } from '../types/dre';
import { orderService } from './orderService';
import { accountPayableService } from './accountPayableService';
import { accountReceivableService } from './accountReceivableService';
import { fixedCostService } from './fixedCostService';
import { variableCostService } from './variableCostService';
import { stockService } from './stockService';
import { dreCategoryMappingService } from './dreCategoryMappingService';
import { cashRegisterService } from './cashRegisterService';
import { deliveryDriverService } from './deliveryDriverService';
import { dreSettingsService } from './dreSettingsService';
import { dreAdjustmentService } from './dreAdjustmentService';

export const dreService = {
  calculate: async (
    fromDate: string,
    toDate: string,
    includePreviousPeriod = true
  ): Promise<DRESummary> => {
    const [
      orders,
      payables,
      receivables,
      fixedCosts,
      variableCosts,
      stockMovements,
      mappings,
      cashRegisters,
      drivers,
      adjustments,
      dreSettings,
    ] = await Promise.all([
      orderService.getAll(),
      accountPayableService.getAll(),
      accountReceivableService.getAll(),
      fixedCostService.getAll(),
      variableCostService.getAll(),
      stockService.getAll(),
      dreCategoryMappingService.getAll(),
      cashRegisterService.getAll(),
      deliveryDriverService.getAll(),
      dreAdjustmentService.getByPeriod(fromDate, toDate),
      dreSettingsService.get(),
    ]);

    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');

    // Filtrar apenas caixas fechados no período
    const closedCashRegisters = cashRegisters.filter((cr) => {
      if (cr.status !== 'closed' || !cr.closedAt) return false;
      const closedDate = new Date(cr.closedAt);
      return closedDate >= from && closedDate <= to;
    });

    // Filtrar pedidos concluídos no período E que pertençam a caixas fechados
    const completedOrders = orders.filter((order) => {
      if (order.status !== 'completed') return false;
      const orderDate = new Date(order.createdAt);
      if (orderDate < from || orderDate > to) return false;

      // Verificar se o pedido pertence a um caixa fechado
      if (order.cashRegisterId) {
        const orderCashRegister = cashRegisters.find((cr) => String(cr.id) === String(order.cashRegisterId));
        // Se o caixa existe e está fechado, e foi fechado no período, incluir
        if (orderCashRegister && orderCashRegister.status === 'closed' && orderCashRegister.closedAt) {
          const closedDate = new Date(orderCashRegister.closedAt);
          return closedDate >= from && closedDate <= to;
        }
        // Se o caixa não existe ou não está fechado, não incluir
        return false;
      }
      // Se não tem caixa vinculado, não incluir
      return false;
    });

    // Faturamento Total
    const totalRevenue = completedOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    // Faturamento por Forma de Pagamento (agrupado por nome + tipo)
    const paymentMethodMap = new Map<string, number>();
    completedOrders.forEach((order) => {
      const baseName = order.paymentMethodName || 'Não informado';
      let methodKey = baseName;
      
      // Adicionar tipo de pagamento ao nome
      if (order.paymentMethodKind) {
        const kindLabels: Record<string, string> = {
          'credit': 'Cartão de Crédito',
          'debit': 'Cartão de Débito',
          'pix': 'PIX',
          'cash': 'Dinheiro',
          'other': 'Outro',
        };
        const kindLabel = kindLabels[order.paymentMethodKind] || order.paymentMethodKind;
        methodKey = `${baseName} - ${kindLabel}`;
      }
      
      const current = paymentMethodMap.get(methodKey) || 0;
      paymentMethodMap.set(methodKey, current + (order.total || 0));
    });
    // Aplicar ajustes manuais à receita total
    const revenueAdjustment = adjustments.find(
      (adj) => adj.itemType === 'revenue' && adj.itemName === 'Receita Total'
    );
    
    const paymentMethodBreakdown = Array.from(paymentMethodMap.entries()).map(([methodName, amount]) => {
      // Verificar se há ajuste específico para esta forma de pagamento
      const detailAdjustment = adjustments.find(
        (adj) => adj.itemType === 'revenue' && adj.itemName === `Receita Total - ${methodName}`
      );
      const adjustedAmount = detailAdjustment ? detailAdjustment.adjustedAmount : amount;
      return {
        methodName,
        amount: adjustedAmount,
      };
    });
    
    // Recalcular receita total se houver ajustes nos detalhes de formas de pagamento
    const totalFromDetails = paymentMethodBreakdown.reduce((sum, method) => sum + method.amount, 0);
    const adjustedTotalRevenueWithDetails = revenueAdjustment
      ? revenueAdjustment.adjustedAmount
      : (totalFromDetails !== totalRevenue ? totalFromDetails : totalRevenue);

    // Receitas - apenas total (com ajustes aplicados)
    // Nota: as sobras do caixa serão adicionadas depois
    const revenueBreakdown: DREItem[] = [
      {
        categoryName: 'Receita Total',
        amount: adjustedTotalRevenueWithDetails,
        type: 'revenue',
      },
    ];

    // CMV - Calcular valor de compra das movimentações de entrada (IN) no período
    // Isso inclui movimentações iniciais se corresponderem ao período
    // Apenas se useAutomaticPDVValues estiver ativado
    let cmvAmount = 0;
    if (dreSettings.useAutomaticPDVValues) {
      const inMovements = stockMovements.filter((movement: any) => {
        if (movement.type !== 'IN') return false;
        const movDate = new Date(movement.date);
        return movDate >= from && movDate <= to;
      });

      inMovements.forEach((movement: any) => {
        const cost = (movement.unitCost || 0) * (movement.quantity || 0);
        cmvAmount += cost;
      });
    }

    // Despesas Fixas (somar todos que devem aparecer no DRE)
    // Apenas se useConfiguredFixedValues estiver ativado
    let fixedCostsAmount = 0;
    if (dreSettings.useConfiguredFixedValues) {
      fixedCostsAmount = fixedCosts
        .filter((fc) => fc.showInDRE !== false)
        .reduce((sum, cost) => sum + (cost.value || 0), 0);
    }

    // Despesas Variáveis (porcentagem sobre faturamento)
    // Filtrar apenas os que devem aparecer no DRE (showInDRE !== false)
    // Apenas se useConfiguredFixedValues estiver ativado
    let variableCostsAmount = 0;
    if (dreSettings.useConfiguredFixedValues) {
      variableCosts
        .filter((vc) => vc.showInDRE !== false)
        .forEach((vc) => {
          const value = (totalRevenue * (vc.percentage || 0)) / 100;
          variableCostsAmount += value;
        });
    }

    // Contas a Pagar pagas no período APÓS o fechamento do caixa correspondente
    // Uma conta a pagar só entra no DRE se foi paga após o fechamento do caixa
    const paidPayables = payables.filter((payable) => {
      if (payable.status !== 'paid' || !payable.paidDate) return false;
      const paidDate = new Date(payable.paidDate);
      
      // Verificar se a data de pagamento está no período E se existe algum caixa fechado até essa data
      if (paidDate < from || paidDate > to) return false;
      
      // Verificar se existe pelo menos um caixa fechado antes ou na data do pagamento
      const hasClosedCashRegister = closedCashRegisters.some((cr) => {
        if (!cr.closedAt) return false;
        const closedDate = new Date(cr.closedAt);
        return closedDate <= paidDate;
      });
      
      if (!hasClosedCashRegister) return false;
      
      // Verificar se já foi conciliado com uma categoria
      const isMapped = mappings.some((m) => String(m.accountPayableId) === String(payable.id));
      
      return !isMapped; // Só incluir se não foi mapeado
    });

    // Contas a Receber recebidas no período (que não foram conciliadas com categorias)
    const receivedReceivables = receivables.filter((receivable) => {
      if (receivable.status !== 'received' || !receivable.receivedDate) return false;
      const receivedDate = new Date(receivable.receivedDate);
      const isInPeriod = receivedDate >= from && receivedDate <= to;
      
      // Verificar se já foi conciliado com uma categoria
      const isMapped = mappings.some((m) => String(m.accountReceivableId) === String(receivable.id));
      
      return isInPeriod && !isMapped; // Só incluir se não foi mapeado
    });

    // Outras despesas de contas a pagar pagas (não mapeadas)
    const otherPayablesAmount = paidPayables.reduce((sum, payable) => sum + (payable.amount || 0), 0);

    // Outras receitas de contas a receber recebidas (não mapeadas)
    const otherReceivablesAmount = receivedReceivables.reduce(
      (sum, receivable) => sum + (receivable.amount || 0),
      0
    );

    // Agrupar despesas/receitas por categoria (das conciliações)
    // Apenas contas pagas APÓS fechamento do caixa
    const mappedPayables = mappings.filter((m) => {
      if (!m.accountPayableId) return false;
      const payable = payables.find((p) => String(p.id) === String(m.accountPayableId));
      if (!payable || payable.status !== 'paid' || !payable.paidDate) return false;
      const paidDate = new Date(payable.paidDate);
      
      // Verificar se está no período
      if (paidDate < from || paidDate > to) return false;
      
      // Verificar se existe pelo menos um caixa fechado antes ou na data do pagamento
      const hasClosedCashRegister = closedCashRegisters.some((cr) => {
        if (!cr.closedAt) return false;
        const closedDate = new Date(cr.closedAt);
        return closedDate <= paidDate;
      });
      
      return hasClosedCashRegister;
    });

    const mappedReceivables = mappings.filter((m) => {
      if (!m.accountReceivableId) return false;
      const receivable = receivables.find((r) => String(r.id) === String(m.accountReceivableId));
      if (!receivable || receivable.status !== 'received' || !receivable.receivedDate) return false;
      const receivedDate = new Date(receivable.receivedDate);
      return receivedDate >= from && receivedDate <= to;
    });

    // Agrupar por categoria
    const categoryRevenueMap = new Map<string, number>();
    const categoryExpenseMap = new Map<string, { name: string; amount: number }>();

    mappedReceivables.forEach((m) => {
      if (m.categoryId) {
        const current = categoryRevenueMap.get(m.categoryId) || 0;
        categoryRevenueMap.set(m.categoryId, current + m.amount);
      }
    });

    mappedPayables.forEach((m) => {
      if (m.categoryId && m.categoryName) {
        const existing = categoryExpenseMap.get(m.categoryId);
        if (existing) {
          categoryExpenseMap.set(m.categoryId, {
            name: m.categoryName,
            amount: existing.amount + m.amount,
          });
        } else {
          categoryExpenseMap.set(m.categoryId, {
            name: m.categoryName,
            amount: m.amount,
          });
        }
      }
    });

    // Adicionar receitas categorizadas
    categoryRevenueMap.forEach((amount, categoryId) => {
      const mapping = mappedReceivables.find((m) => String(m.categoryId) === String(categoryId));
      if (mapping && mapping.categoryName) {
        revenueBreakdown.push({
          categoryId,
          categoryName: mapping.categoryName,
          amount,
          type: 'revenue',
        });
      }
    });

    // Not used for now, keeping for future
    // const settings = businessSettings[0];
    // Taxas de cartão já estão deduzidas do netAmount dos pedidos
    // Somar taxas de cartão pagas nos pedidos (APENAS para pagamentos de maquininha: credit, debit, pix)
    const cardFeesAmount = completedOrders
      .filter(order => {
        const isMachinePayment = order.paymentMethodKind === 'credit' || 
                                 order.paymentMethodKind === 'debit' || 
                                 order.paymentMethodKind === 'pix';
        return isMachinePayment;
      })
      .reduce((sum, order) => sum + (order.cardFee || 0), 0);

    // Taxas de entregadores (deliveryFeeDriverAmount) - apenas taxas de entrega
    // Só somar se o entregador recebe taxa (receivesDeliveryFee = true)
    const deliveryFeesOnly = completedOrders.reduce((sum, order) => {
      if (!order.deliveryDriverId || !order.deliveryFee || order.deliveryFee <= 0) {
        return sum;
      }
      
      const driver = drivers.find(d => String(d.id) === String(order.deliveryDriverId));
      // Só soma a taxa se o entregador recebe taxa de entrega
      if (!driver || !driver.receivesDeliveryFee) {
        return sum;
      }
      
      return sum + (order.deliveryFee || 0);
    }, 0);
    
    // Agrupar taxas de cartão por maquininha + tipo de pagamento (APENAS pagamentos de maquininha)
    const cardFeesByMachine = new Map<string, number>();
    completedOrders.forEach(order => {
      // Só processar se for pagamento de maquininha (credit, debit, pix) e tiver cardFee > 0
      const isMachinePayment = order.paymentMethodKind === 'credit' || 
                               order.paymentMethodKind === 'debit' || 
                               order.paymentMethodKind === 'pix';
      if (!isMachinePayment || !order.cardFee || order.cardFee <= 0 || !order.paymentMethodName) {
        return;
      }
      
      const baseName = order.paymentMethodName;
      let methodKey = baseName;
      
      // Adicionar tipo de pagamento ao nome
      if (order.paymentMethodKind) {
        const kindLabels: Record<string, string> = {
          'credit': 'Cartão de Crédito',
          'debit': 'Cartão de Débito',
          'pix': 'PIX',
        };
        const kindLabel = kindLabels[order.paymentMethodKind] || order.paymentMethodKind;
        methodKey = `${baseName} - ${kindLabel}`;
      }
      
      const current = cardFeesByMachine.get(methodKey) || 0;
      cardFeesByMachine.set(methodKey, current + order.cardFee);
    });
    
    // Agrupar taxas de entregadores por entregador (apenas taxas de entrega, apenas se recebe taxa)
    const deliveryFeesByDriver = new Map<string, number>();
    completedOrders.forEach(order => {
      if (!order.deliveryDriverId || !order.deliveryFee || order.deliveryFee <= 0) {
        return;
      }
      
      const driver = drivers.find(d => String(d.id) === String(order.deliveryDriverId));
      // Só soma a taxa se o entregador recebe taxa de entrega
      if (!driver || !driver.receivesDeliveryFee) {
        return;
      }
      
      const driverName = order.deliveryDriverName || 'Sem entregador';
      const current = deliveryFeesByDriver.get(driverName) || 0;
      deliveryFeesByDriver.set(driverName, current + order.deliveryFee);
    });
    
    // Calcular diárias dos entregadores (uma vez por dia trabalhado)
    const driverDays = new Map<string, Set<string>>(); // Map<driverKey, Set<dates>>
    completedOrders.forEach(order => {
      const driverId = order.deliveryDriverId;
      if (!driverId) return;
      
      const driver = drivers.find(d => String(d.id) === String(driverId));
      if (!driver || !driver.dailyRate || driver.dailyRate <= 0) return;
      
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
      const driverKey = order.deliveryDriverName || driverId;
      
      if (!driverDays.has(driverKey)) {
        driverDays.set(driverKey, new Set());
      }
      driverDays.get(driverKey)!.add(orderDate);
    });
    
    // Calcular total de diárias e adicionar aos detalhes por entregador
    let totalDailyRates = 0;
    const dailyRatesByDriver = new Map<string, number>();
    driverDays.forEach((dates, driverKey) => {
      // Tentar encontrar o entregador pelo nome ou ID
      let driver = drivers.find(d => d.name === driverKey || String(d.id) === driverKey);
      
      // Se não encontrou pelo nome, tentar encontrar pelo ID do pedido
      if (!driver) {
        const orderWithDriver = completedOrders.find(o => 
          (o.deliveryDriverName === driverKey || String(o.deliveryDriverId) === driverKey) && o.deliveryDriverId
        );
        if (orderWithDriver && orderWithDriver.deliveryDriverId) {
          driver = drivers.find(d => String(d.id) === String(orderWithDriver.deliveryDriverId));
        }
      }
      
      if (driver && driver.dailyRate && driver.dailyRate > 0) {
        const daysCount = dates.size;
        const dailyRateTotal = driver.dailyRate * daysCount;
        totalDailyRates += dailyRateTotal;
        
        // Guardar diária separadamente (não adicionar a deliveryFeesByDriver, que é só taxas)
        dailyRatesByDriver.set(driverKey, dailyRateTotal);
      }
    });
    
    // Total de despesas com entregadores = taxas (variável) + diárias (fixa)
    // Nota: Não precisamos de uma variável total pois agora são separadas

    // Despesas detalhadas - SEPARADAS em Variáveis e Fixas
    const variableExpenses: DREItem[] = [];
    const fixedExpenses: DREItem[] = [];
    
    // === DESPESAS VARIÁVEIS ===
    // Adicionar CMV (Custo das Mercadorias Vendidas) - apenas se useAutomaticPDVValues estiver ativado
    if (dreSettings.useAutomaticPDVValues && cmvAmount > 0) {
      variableExpenses.push({
        categoryName: 'CMV - Custo das Mercadorias Vendidas',
        amount: cmvAmount,
        type: 'expense',
        isVariable: true,
      });
    }

    // Adicionar cada custo variável individualmente (aplicar ajustes se houver)
    // Filtrar apenas os que devem aparecer no DRE (showInDRE !== false)
    // Apenas se useConfiguredFixedValues estiver ativado
    if (dreSettings.useConfiguredFixedValues) {
      variableCosts
        .filter((vc) => vc.showInDRE !== false)
        .forEach((vc) => {
        const value = (adjustedTotalRevenueWithDetails * (vc.percentage || 0)) / 100;
        if (value > 0) {
          const itemName = `${vc.name} (${vc.percentage || 0}%)`;
          const vcAdjustment = adjustments.find(
            (adj) => adj.itemType === 'expense' && adj.itemName === itemName
          );
          const adjustedValue = vcAdjustment ? vcAdjustment.adjustedAmount : value;
          
          variableExpenses.push({
            categoryName: itemName,
            amount: adjustedValue,
            type: 'expense',
            isVariable: true,
          });
        }
      });
    }

    // Adicionar despesas com maquininha de cartão (variável) - detalhado por maquininha
    // Apenas se useAutomaticPDVValues estiver ativado
    if (dreSettings.useAutomaticPDVValues && cardFeesAmount > 0) {
      const cardFeesAdjustment = adjustments.find(
        (adj) => adj.itemType === 'expense' && adj.itemName === 'Despesas com Maquininha de Cartão'
      );
      const adjustedCardFees = cardFeesAdjustment ? cardFeesAdjustment.adjustedAmount : cardFeesAmount;
      
      const details: import('../types/dre').DREItemDetail[] = [];
      let totalDetailsAmount = 0;
      cardFeesByMachine.forEach((amount: number, machineName: string) => {
        // Verificar se há ajuste específico para este detalhe
        const detailAdjustment = adjustments.find(
          (adj) => adj.itemType === 'expense' && adj.itemName === `Despesas com Maquininha de Cartão - ${machineName}`
        );
        const adjustedDetailAmount = detailAdjustment ? detailAdjustment.adjustedAmount : amount;
        totalDetailsAmount += adjustedDetailAmount;
        details.push({ name: machineName, amount: adjustedDetailAmount });
      });
      
      // Se houver ajustes nos detalhes, recalcular o total baseado nos detalhes ajustados
      const finalCardFees = details.length > 0 && totalDetailsAmount !== adjustedCardFees
        ? totalDetailsAmount
        : adjustedCardFees;
      
      variableExpenses.push({
        categoryName: 'Despesas com Maquininha de Cartão',
        amount: finalCardFees,
        type: 'expense',
        isVariable: true,
        details: details.length > 0 ? details : undefined,
      });
    }

    // Adicionar despesas com entregadores - TAXAS DE ENTREGA (variável) - detalhado por entregador
    // Apenas se useAutomaticPDVValues estiver ativado
    if (dreSettings.useAutomaticPDVValues && deliveryFeesOnly > 0) {
      const deliveryAdjustment = adjustments.find(
        (adj) => adj.itemType === 'expense' && adj.itemName === 'Taxas de Entrega aos Entregadores'
      );
      const adjustedDeliveryFees = deliveryAdjustment
        ? deliveryAdjustment.adjustedAmount
        : deliveryFeesOnly;
      
      const details: import('../types/dre').DREItemDetail[] = [];
      let totalDetailsAmount = 0;
      deliveryFeesByDriver.forEach((amount: number, driverName: string) => {
        // Verificar se há ajuste específico para este detalhe
        const detailAdjustment = adjustments.find(
          (adj) => adj.itemType === 'expense' && adj.itemName === `Taxas de Entrega aos Entregadores - ${driverName}`
        );
        const adjustedDetailAmount = detailAdjustment ? detailAdjustment.adjustedAmount : amount;
        totalDetailsAmount += adjustedDetailAmount;
        // amount aqui é apenas a taxa de entrega (não inclui diária)
        details.push({ name: driverName, amount: adjustedDetailAmount });
      });
      
      // Se houver ajustes nos detalhes, recalcular o total baseado nos detalhes ajustados
      const finalDeliveryFees = details.length > 0 && totalDetailsAmount !== adjustedDeliveryFees
        ? totalDetailsAmount
        : adjustedDeliveryFees;
      
      variableExpenses.push({
        categoryName: 'Taxas de Entrega aos Entregadores',
        amount: finalDeliveryFees,
        type: 'expense',
        isVariable: true,
        details: details.length > 0 ? details : undefined,
      });
    }

    // === DESPESAS FIXAS ===
    // Adicionar diárias dos entregadores (fixa) - detalhado por entregador
    // Apenas se useAutomaticPDVValues estiver ativado
    if (dreSettings.useAutomaticPDVValues && totalDailyRates > 0) {
      const dailyRatesAdjustment = adjustments.find(
        (adj) => adj.itemType === 'expense' && adj.itemName === 'Diárias dos Entregadores'
      );
      const adjustedDailyRates = dailyRatesAdjustment
        ? dailyRatesAdjustment.adjustedAmount
        : totalDailyRates;
      
      const details: import('../types/dre').DREItemDetail[] = [];
      let totalDetailsAmount = 0;
      dailyRatesByDriver.forEach((amount: number, driverKey: string) => {
        // Verificar se há ajuste específico para este detalhe
        const detailAdjustment = adjustments.find(
          (adj) => adj.itemType === 'expense' && adj.itemName === `Diárias dos Entregadores - ${driverKey}`
        );
        const adjustedDetailAmount = detailAdjustment ? detailAdjustment.adjustedAmount : amount;
        totalDetailsAmount += adjustedDetailAmount;
        details.push({ name: driverKey, amount: adjustedDetailAmount });
      });
      
      // Se houver ajustes nos detalhes, recalcular o total baseado nos detalhes ajustados
      const finalDailyRates = details.length > 0 && totalDetailsAmount !== adjustedDailyRates
        ? totalDetailsAmount
        : adjustedDailyRates;
      
      fixedExpenses.push({
        categoryName: 'Diárias dos Entregadores',
        amount: finalDailyRates,
        type: 'expense',
        isVariable: false,
        details: details.length > 0 ? details : undefined,
      });
    }

    // Adicionar cada custo fixo individualmente (aplicar ajustes se houver)
    // Filtrar apenas os que devem aparecer no DRE (showInDRE !== false)
    // Apenas se useConfiguredFixedValues estiver ativado
    if (dreSettings.useConfiguredFixedValues) {
      fixedCosts
        .filter((fc) => fc.showInDRE !== false)
        .forEach((fc) => {
        if ((fc.value || 0) > 0) {
          const fcAdjustment = adjustments.find(
            (adj) => adj.itemType === 'expense' && adj.itemName === fc.name
          );
          const adjustedValue = fcAdjustment ? fcAdjustment.adjustedAmount : fc.value || 0;
          
          fixedExpenses.push({
            categoryName: fc.name,
            amount: adjustedValue,
          type: 'expense',
          isVariable: false,
        });
        }
      });
    }

    // Adicionar outras despesas (contas a pagar não categorizadas) - apenas após fechamento do caixa
    if (otherPayablesAmount > 0) {
      const otherPayablesAdjustment = adjustments.find(
        (adj) => adj.itemType === 'expense' && adj.itemName === 'Outras Despesas'
      );
      const adjustedOtherPayables = otherPayablesAdjustment
        ? otherPayablesAdjustment.adjustedAmount
        : otherPayablesAmount;
      
      // Criar detalhes com cada conta a pagar individual
      const otherPayablesDetails: import('../types/dre').DREItemDetail[] = [];
      let totalDetailsAmount = 0;
      paidPayables.forEach((payable) => {
        // Verificar se há ajuste específico para este detalhe
        const detailAdjustment = adjustments.find(
          (adj) => adj.itemType === 'expense' && adj.itemName === `Outras Despesas - ${payable.description}`
        );
        const adjustedAmount = detailAdjustment ? detailAdjustment.adjustedAmount : payable.amount || 0;
        totalDetailsAmount += adjustedAmount;
        otherPayablesDetails.push({
          name: payable.description || 'Sem descrição',
          amount: adjustedAmount,
        });
      });
      
      // Se houver ajustes nos detalhes, recalcular o total baseado nos detalhes ajustados
      const finalOtherPayables = otherPayablesDetails.length > 0 && totalDetailsAmount !== adjustedOtherPayables
        ? totalDetailsAmount
        : adjustedOtherPayables;
      
      fixedExpenses.push({
        categoryName: 'Outras Despesas',
        amount: finalOtherPayables,
        type: 'expense',
        isVariable: false,
        details: otherPayablesDetails.length > 0 ? otherPayablesDetails : undefined,
      });
    }

    // Calcular furos do caixa (diferenças no fechamento) - precisa ser feito antes de calcular totalExpenses
    // Faltas (diferenças negativas) são despesas, sobras (diferenças positivas) são receitas
    const cashRegisterDifferences = {
      positive: 0,
      negative: 0,
      total: 0,
      details: closedCashRegisters
        .filter((cr) => cr.difference !== undefined && cr.difference !== null)
        .map((cr) => ({
          cashRegisterId: cr.id,
          date: cr.closedAt || '',
          expectedBalance: cr.expectedBalance || 0,
          actualBalance: cr.actualBalance || 0,
          difference: cr.difference || 0,
        })),
    };
    
    cashRegisterDifferences.positive = cashRegisterDifferences.details
      .filter((d) => d.difference > 0)
      .reduce((sum, d) => sum + d.difference, 0);
    cashRegisterDifferences.negative = Math.abs(
      cashRegisterDifferences.details
        .filter((d) => d.difference < 0)
        .reduce((sum, d) => sum + d.difference, 0)
    );
    cashRegisterDifferences.total = cashRegisterDifferences.positive - cashRegisterDifferences.negative;

    // Faltas e sobras do caixa não são mais adicionadas como despesas/receitas separadas
    // Elas aparecem apenas na seção de "Furos do Caixa" logo abaixo do lucro líquido

    // Adicionar despesas categorizadas (via conciliação) - apenas após fechamento do caixa
    // Verificar se a categoria indica se é variável ou fixa baseado no nome
    categoryExpenseMap.forEach((item, categoryId) => {
      if (item.amount > 0) {
        // Verificar se é fixa ou variável baseado na categoria
        // Categorias com "Custo Variável" são variáveis, outras são fixas
        const isVariableCategory = item.name.toLowerCase().includes('variável') || 
                                    item.name.toLowerCase().includes('variavel');
        
        if (isVariableCategory) {
          variableExpenses.push({
            categoryId,
            categoryName: item.name,
            amount: item.amount,
            type: 'expense',
            isVariable: true,
          });
        } else {
          fixedExpenses.push({
            categoryId,
            categoryName: item.name,
            amount: item.amount,
            type: 'expense',
            isVariable: false,
          });
        }
      }
    });

    // Sobras do caixa não são mais adicionadas como receita separada
    // Elas aparecem apenas na seção de "Furos do Caixa" logo abaixo do lucro líquido

    // Combinar: primeiro variáveis, depois fixas
    const expenseBreakdown: DREItem[] = [...variableExpenses, ...fixedExpenses];

    // Se houver outras receitas, incluir no total
    // (já está sendo somado em totalRevenueWithExtras)

    // Somar todas as despesas categorizadas
    const mappedExpensesAmount = Array.from(categoryExpenseMap.values()).reduce(
      (sum, item) => sum + item.amount,
      0
    );

    // Faltas do caixa não são mais incluídas no total de despesas
    // Elas apenas descontam da geração de caixa
    const totalExpenses =
      cmvAmount +
      variableCostsAmount +
      cardFeesAmount +
      deliveryFeesOnly + // Apenas taxas de entrega (variável)
      fixedCostsAmount +
      totalDailyRates + // Diárias (fixa)
      otherPayablesAmount +
      mappedExpensesAmount;

    // Somar todas as receitas categorizadas
    const mappedRevenueAmount = Array.from(categoryRevenueMap.values()).reduce((sum, amount) => sum + amount, 0);
    // Sobras do caixa não são mais incluídas na receita total
    const totalRevenueWithExtras = adjustedTotalRevenueWithDetails + otherReceivablesAmount + mappedRevenueAmount;

    const netProfit = totalRevenueWithExtras - totalExpenses; // Lucro Líquido

    // Calcular Total de Geração de Caixa (soma de todos os lucros históricos)
    // Buscar todos os pedidos concluídos desde o início
    const allCompletedOrders = orders.filter((order) => order.status === 'completed');
    
    // Agrupar por período mensal e calcular lucro de cada mês
    const monthlyProfits = new Map<string, number>();
    
    allCompletedOrders.forEach((order) => {
      const orderDate = new Date(order.createdAt);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Para cada pedido, calcular receita e despesas aproximadas
      const orderRevenue = order.total || 0;
      
      // Calcular despesas aproximadas para este pedido
      // Só considerar taxa se for pagamento de maquininha (credit, debit, pix)
      const isMachinePayment = order.paymentMethodKind === 'credit' || 
                               order.paymentMethodKind === 'debit' || 
                               order.paymentMethodKind === 'pix';
      const orderCardFee = isMachinePayment ? (order.cardFee || 0) : 0;
      
      // Apenas taxa de entrega como variável (não incluir diárias que são fixas)
      // Verificar se o entregador recebe taxa antes de considerar
      let orderDeliveryFee = 0;
      if (order.deliveryDriverId && order.deliveryFee && order.deliveryFee > 0) {
        const driver = drivers.find(d => String(d.id) === String(order.deliveryDriverId));
        if (driver && driver.receivesDeliveryFee) {
          orderDeliveryFee = order.deliveryFee;
        }
      }
      
      // Custos variáveis sobre a receita (apenas se useConfiguredFixedValues estiver ativado)
      let orderVariableCosts = 0;
      if (dreSettings.useConfiguredFixedValues) {
        orderVariableCosts = variableCosts
          .filter((vc) => vc.showInDRE !== false)
          .reduce((sum, vc) => {
            return sum + (orderRevenue * (vc.percentage || 0)) / 100;
          }, 0);
      }
      
      // Calcular custo fixo proporcional (dividir custos fixos mensais pelo número de dias do mês)
      // Apenas se useConfiguredFixedValues estiver ativado
      let orderFixedCosts = 0;
      if (dreSettings.useConfiguredFixedValues) {
        const orderDateObj = new Date(order.createdAt);
        const daysInMonth = new Date(orderDateObj.getFullYear(), orderDateObj.getMonth() + 1, 0).getDate();
        orderFixedCosts = fixedCosts
          .filter((fc) => fc.showInDRE !== false)
          .reduce((sum, fc) => {
            return sum + ((fc.value || 0) / daysInMonth);
          }, 0);
      }
      
      // Lucro do pedido (aproximado)
      const orderProfit = orderRevenue - orderCardFee - orderDeliveryFee - orderVariableCosts - orderFixedCosts;
      
      const current = monthlyProfits.get(monthKey) || 0;
      monthlyProfits.set(monthKey, current + orderProfit);
    });
    
    // Somar todos os lucros mensais para obter o total acumulado
    let totalCashGeneration = Array.from(monthlyProfits.values()).reduce((sum, profit) => sum + profit, 0);
    
    // Descontar furos negativos (faltas) da geração de caixa
    // Somar furos de todos os caixas fechados desde o início
    const allClosedCashRegisters = cashRegisters.filter((cr) => cr.status === 'closed');
    const totalNegativeDifferences = allClosedCashRegisters.reduce((sum, cr) => {
      if (cr.difference !== undefined && cr.difference !== null && cr.difference < 0) {
        return sum + Math.abs(cr.difference);
      }
      return sum;
    }, 0);
    totalCashGeneration = totalCashGeneration - totalNegativeDifferences;

    // Calcular Ponto de Equilíbrio
    // Ponto de Equilíbrio = Custos Fixos Totais / (1 - % Custos Variáveis sobre Receita)
    // Ou: PE = Custos Fixos / Margem de Contribuição Unitária
    
    // Usar as despesas fixas já calculadas (incluem ajustes e outras despesas)
    const totalFixedExpenses = fixedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calcular receita total para cálculo de %
    const revenueForCalculation = adjustedTotalRevenueWithDetails;
    
    // Calcular % total de custos variáveis sobre a receita (apenas os que aparecem no DRE)
    // Apenas se useConfiguredFixedValues estiver ativado
    let totalVariableCostsPercentage = 0;
    if (dreSettings.useConfiguredFixedValues) {
      totalVariableCostsPercentage = variableCosts
        .filter((vc) => vc.showInDRE !== false)
        .reduce((sum, vc) => sum + (vc.percentage || 0), 0);
    }
    
    // Considerar também CMV e taxas de cartão/entregadores como % variável se useAutomaticPDVValues estiver ativado
    // Calcular margem de contribuição (1 - % custos variáveis)
    // NOTA: Apenas taxas de entrega são variáveis, diárias são fixas
    let avgCardFeePercentage = 0;
    let cmvPercentage = 0;
    let deliveryFeesPercentage = 0;
    
    if (dreSettings.useAutomaticPDVValues) {
      avgCardFeePercentage = revenueForCalculation > 0 ? (cardFeesAmount / revenueForCalculation) * 100 : 0;
      cmvPercentage = revenueForCalculation > 0 ? (cmvAmount / revenueForCalculation) * 100 : 0;
      // Apenas taxas de entrega são variáveis (não incluir diárias)
      deliveryFeesPercentage = revenueForCalculation > 0 ? (deliveryFeesOnly / revenueForCalculation) * 100 : 0;
    }
    
    const totalVariablePercentage = totalVariableCostsPercentage + avgCardFeePercentage + cmvPercentage + deliveryFeesPercentage;
    const contributionMargin = 1 - totalVariablePercentage / 100;
    
    // Ponto de Equilíbrio
    // PE = Custos Fixos Totais / Margem de Contribuição
    let breakEvenPoint = 0;
    if (contributionMargin > 0 && contributionMargin < 1) {
      breakEvenPoint = totalFixedExpenses / contributionMargin;
    } else {
      // Se a margem de contribuição for negativa ou zero, não há ponto de equilíbrio
      breakEvenPoint = Infinity;
    }

    // Calcular período anterior para comparação
    let previousPeriod: DRESummary['previousPeriod'] | undefined = undefined;
    if (includePreviousPeriod) {
      const periodDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      const prevTo = new Date(from);
      prevTo.setDate(prevTo.getDate() - 1);
      const prevFrom = new Date(prevTo);
      prevFrom.setDate(prevFrom.getDate() - periodDays + 1);

      // Filtrar caixas fechados no período anterior
      const prevClosedCashRegisters = cashRegisters.filter((cr) => {
        if (cr.status !== 'closed' || !cr.closedAt) return false;
        const closedDate = new Date(cr.closedAt);
        return closedDate >= prevFrom && closedDate <= prevTo;
      });

      // Calcular dados do período anterior - apenas pedidos de caixas fechados
      const prevCompletedOrders = orders.filter((order) => {
        if (order.status !== 'completed') return false;
        const orderDate = new Date(order.createdAt);
        if (orderDate < prevFrom || orderDate > prevTo) return false;

        // Verificar se o pedido pertence a um caixa fechado no período anterior
        if (order.cashRegisterId) {
          const orderCashRegister = cashRegisters.find((cr) => String(cr.id) === String(order.cashRegisterId));
          if (orderCashRegister && orderCashRegister.status === 'closed' && orderCashRegister.closedAt) {
            const closedDate = new Date(orderCashRegister.closedAt);
            return closedDate >= prevFrom && closedDate <= prevTo;
          }
          return false;
        }
        return false;
      });

      const prevTotalRevenue = prevCompletedOrders.reduce((sum, order) => sum + (order.total || 0), 0);

      // CMV do período anterior - valor de compra das movimentações de entrada (IN)
      // Apenas se useAutomaticPDVValues estiver ativado
      let prevCmvAmount = 0;
      if (dreSettings.useAutomaticPDVValues) {
        const prevInMovements = stockMovements.filter((movement: any) => {
          if (movement.type !== 'IN') return false;
          const movDate = new Date(movement.date);
          return movDate >= prevFrom && movDate <= prevTo;
        });

        prevInMovements.forEach((movement: any) => {
          const cost = (movement.unitCost || 0) * (movement.quantity || 0);
          prevCmvAmount += cost;
        });
      }

      // Calcular despesas do período anterior (simplificado - usando mesmos custos fixos e variáveis)
      let prevVariableCostsAmount = 0;
      if (dreSettings.useConfiguredFixedValues) {
        prevVariableCostsAmount = variableCosts
          .filter((vc) => vc.showInDRE !== false)
          .reduce((sum, vc) => {
            const value = (prevTotalRevenue * (vc.percentage || 0)) / 100;
            return sum + value;
          }, 0);
      }

      // Taxas de cartão do período anterior (APENAS para pagamentos de maquininha: credit, debit, pix)
      const prevCardFeesAmount = prevCompletedOrders
        .filter(order => {
          const isMachinePayment = order.paymentMethodKind === 'credit' || 
                                   order.paymentMethodKind === 'debit' || 
                                   order.paymentMethodKind === 'pix';
          return isMachinePayment;
        })
        .reduce((sum, order) => sum + (order.cardFee || 0), 0);
      
      // Taxas de entregadores do período anterior (apenas se o entregador recebe taxa)
      const prevDeliveryFeesOnly = prevCompletedOrders.reduce((sum, order) => {
        if (!order.deliveryDriverId || !order.deliveryFee || order.deliveryFee <= 0) {
          return sum;
        }
        
        const driver = drivers.find(d => String(d.id) === String(order.deliveryDriverId));
        // Só soma a taxa se o entregador recebe taxa de entrega
        if (!driver || !driver.receivesDeliveryFee) {
          return sum;
        }
        
        return sum + (order.deliveryFee || 0);
      }, 0);
      
      // Calcular diárias do período anterior
      const prevDriverDays = new Map<string, Set<string>>();
      prevCompletedOrders.forEach(order => {
        const driverId = order.deliveryDriverId;
        if (!driverId) return;
        
        const driver = drivers.find(d => String(d.id) === String(driverId));
        if (!driver || !driver.dailyRate || driver.dailyRate <= 0) return;
        
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        const driverKey = order.deliveryDriverName || driverId;
        
        if (!prevDriverDays.has(driverKey)) {
          prevDriverDays.set(driverKey, new Set());
        }
        prevDriverDays.get(driverKey)!.add(orderDate);
      });
      
      let prevTotalDailyRates = 0;
      prevDriverDays.forEach((dates, driverKey) => {
        let driver = drivers.find(d => d.name === driverKey || String(d.id) === driverKey);
        
        if (!driver) {
          const orderWithDriver = prevCompletedOrders.find(o => 
            (o.deliveryDriverName === driverKey || String(o.deliveryDriverId) === driverKey) && o.deliveryDriverId
          );
          if (orderWithDriver && orderWithDriver.deliveryDriverId) {
            driver = drivers.find(d => String(d.id) === String(orderWithDriver.deliveryDriverId));
          }
        }
        
        if (driver && driver.dailyRate && driver.dailyRate > 0) {
          const daysCount = dates.size;
          prevTotalDailyRates += driver.dailyRate * daysCount;
        }
      });
      
      // Total de despesas com entregadores do período anterior = taxas (variável) + diárias (fixa)
      // Nota: Não precisamos de uma variável total pois agora são separadas

      let prevFixedCostsAmount = 0;
      if (dreSettings.useConfiguredFixedValues) {
        prevFixedCostsAmount = fixedCosts
          .filter((fc) => fc.showInDRE !== false)
          .reduce((sum, cost) => sum + (cost.value || 0), 0);
      }

      const prevOtherPayables = payables.filter((payable) => {
        if (payable.status !== 'paid' || !payable.paidDate) return false;
        const paidDate = new Date(payable.paidDate);
        if (paidDate < prevFrom || paidDate > prevTo) return false;

        // Verificar se existe um caixa fechado antes ou na data do pagamento
        const hasClosedCashRegister = prevClosedCashRegisters.some((cr) => {
          if (!cr.closedAt) return false;
          const closedDate = new Date(cr.closedAt);
          return closedDate <= paidDate;
        });

        if (!hasClosedCashRegister) return false;

        const isMapped = mappings.some((m) => String(m.accountPayableId) === String(payable.id));
        return !isMapped;
      });

      const prevOtherPayablesAmount = prevOtherPayables.reduce((sum, payable) => sum + (payable.amount || 0), 0);

      const prevMappedPayables = mappings.filter((m) => {
        if (!m.accountPayableId) return false;
        const payable = payables.find((p) => String(p.id) === String(m.accountPayableId));
        if (!payable || payable.status !== 'paid' || !payable.paidDate) return false;
        const paidDate = new Date(payable.paidDate);
        if (paidDate < prevFrom || paidDate > prevTo) return false;

        // Verificar se existe um caixa fechado antes ou na data do pagamento
        const hasClosedCashRegister = prevClosedCashRegisters.some((cr) => {
          if (!cr.closedAt) return false;
          const closedDate = new Date(cr.closedAt);
          return closedDate <= paidDate;
        });

        return hasClosedCashRegister;
      });

      const prevCategoryExpenseMap = new Map<string, { name: string; amount: number }>();
      prevMappedPayables.forEach((m) => {
        if (m.categoryId && m.categoryName) {
          const existing = prevCategoryExpenseMap.get(m.categoryId);
          if (existing) {
            prevCategoryExpenseMap.set(m.categoryId, {
              name: m.categoryName,
              amount: existing.amount + m.amount,
            });
          } else {
            prevCategoryExpenseMap.set(m.categoryId, {
              name: m.categoryName,
              amount: m.amount,
            });
          }
        }
      });

      const prevMappedExpensesAmount = Array.from(prevCategoryExpenseMap.values()).reduce(
        (sum, item) => sum + item.amount,
        0
      );

      const prevTotalExpenses =
        prevCmvAmount +
        prevVariableCostsAmount +
        prevCardFeesAmount +
        prevDeliveryFeesOnly + // Apenas taxas de entrega (variável)
        prevFixedCostsAmount +
        prevTotalDailyRates + // Diárias (fixa)
        prevOtherPayablesAmount +
        prevMappedExpensesAmount;

      // Montar breakdown do período anterior
      const prevExpenseBreakdown: DREItem[] = [];
      
      // Adicionar CMV do período anterior (apenas se useAutomaticPDVValues estiver ativado)
      if (dreSettings.useAutomaticPDVValues && prevCmvAmount > 0) {
        prevExpenseBreakdown.push({
          categoryName: 'CMV - Custo das Mercadorias Vendidas',
          amount: prevCmvAmount,
          type: 'expense',
        });
      }
      
      // Adicionar custos variáveis do período anterior (apenas se useConfiguredFixedValues estiver ativado)
      if (dreSettings.useConfiguredFixedValues) {
        variableCosts
          .filter((vc: any) => vc.showInDRE !== false)
          .forEach((vc: any) => {
            const value = (prevTotalRevenue * (vc.percentage || 0)) / 100;
            if (value > 0) {
              prevExpenseBreakdown.push({
                categoryName: `${vc.name} (${vc.percentage || 0}%)`,
                amount: value,
                type: 'expense',
              });
            }
          });
      }

      // Adicionar despesas automáticas do PDV do período anterior (apenas se useAutomaticPDVValues estiver ativado)
      if (dreSettings.useAutomaticPDVValues) {
        if (prevCardFeesAmount > 0) {
          prevExpenseBreakdown.push({
            categoryName: 'Despesas com Maquininha de Cartão',
            amount: prevCardFeesAmount,
            type: 'expense',
            isVariable: true,
          });
        }

        // Taxas de entrega (variável)
        if (prevDeliveryFeesOnly > 0) {
          prevExpenseBreakdown.push({
            categoryName: 'Taxas de Entrega aos Entregadores',
            amount: prevDeliveryFeesOnly,
            type: 'expense',
            isVariable: true,
          });
        }

        // Diárias (fixa)
        if (prevTotalDailyRates > 0) {
          prevExpenseBreakdown.push({
            categoryName: 'Diárias dos Entregadores',
            amount: prevTotalDailyRates,
            type: 'expense',
            isVariable: false,
          });
        }
      }

      // Adicionar custos fixos do período anterior (apenas se useConfiguredFixedValues estiver ativado)
      if (dreSettings.useConfiguredFixedValues) {
        fixedCosts
          .filter((fc) => fc.showInDRE !== false)
          .forEach((fc) => {
            if ((fc.value || 0) > 0) {
              prevExpenseBreakdown.push({
                categoryName: fc.name,
                amount: fc.value || 0,
                type: 'expense',
              });
            }
          });
      }

      if (prevOtherPayablesAmount > 0) {
        prevExpenseBreakdown.push({
          categoryName: 'Outras Despesas',
          amount: prevOtherPayablesAmount,
          type: 'expense',
        });
      }

      prevCategoryExpenseMap.forEach((item) => {
        if (item.amount > 0) {
          prevExpenseBreakdown.push({
            categoryName: item.name,
            amount: item.amount,
            type: 'expense',
          });
        }
      });

      const prevOtherReceivables = receivables.filter((receivable) => {
        if (receivable.status !== 'received' || !receivable.receivedDate) return false;
        const receivedDate = new Date(receivable.receivedDate);
        const isInPeriod = receivedDate >= prevFrom && receivedDate <= prevTo;
        const isMapped = mappings.some((m) => String(m.accountReceivableId) === String(receivable.id));
        return isInPeriod && !isMapped;
      });

      const prevOtherReceivablesAmount = prevOtherReceivables.reduce(
        (sum, receivable) => sum + (receivable.amount || 0),
        0
      );

      const prevMappedReceivables = mappings.filter((m) => {
        if (!m.accountReceivableId) return false;
        const receivable = receivables.find((r) => String(r.id) === String(m.accountReceivableId));
        if (!receivable || receivable.status !== 'received' || !receivable.receivedDate) return false;
        const receivedDate = new Date(receivable.receivedDate);
        return receivedDate >= prevFrom && receivedDate <= prevTo;
      });

      const prevCategoryRevenueMap = new Map<string, number>();
      prevMappedReceivables.forEach((m) => {
        if (m.categoryId) {
          const current = prevCategoryRevenueMap.get(m.categoryId) || 0;
          prevCategoryRevenueMap.set(m.categoryId, current + m.amount);
        }
      });

      const prevMappedRevenueAmount = Array.from(prevCategoryRevenueMap.values()).reduce(
        (sum, amount) => sum + amount,
        0
      );
      const prevTotalRevenueWithExtras = prevTotalRevenue + prevOtherReceivablesAmount + prevMappedRevenueAmount;

      const prevNetProfit = prevTotalRevenueWithExtras - prevTotalExpenses;

      previousPeriod = {
        totalRevenue: prevTotalRevenue,
        totalExpenses: prevTotalExpenses,
        netProfit: prevNetProfit,
        expenseBreakdown: prevExpenseBreakdown,
      };
    }

    return {
      totalRevenue: totalRevenueWithExtras,
      totalExpenses,
      grossProfit: totalRevenueWithExtras,
      netProfit,
      totalCashGeneration,
      breakEvenPoint,
      revenueBreakdown,
      expenseBreakdown,
      paymentMethodBreakdown,
      cashRegisterDifferences,
      previousPeriod,
    };
  },
};
