import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { Order, OrderStatus } from '../types/order';
import { orderService } from '../services/orderService';
import type { Customer } from '../types/customer';
import { customerService } from '../services/customerService';
import type { PdvProduct } from '../types/pdvProduct';
import { pdvProductService } from '../services/pdvProductService';
import type { ProductCategory } from '../types/productCategory';
import { productCategoryService } from '../services/productCategoryService';
import type { DeliveryArea } from '../types/deliveryArea';
import { deliveryAreaService } from '../services/deliveryAreaService';
// Delivery driver and payment selection removed in fast order modal
import { 
  MdAdd, 
  MdDelete, 
  MdEdit, 
  MdArrowForward, 
  MdArrowBack, 
  MdRestaurant,
  MdLocalShipping,
  MdCheckCircle,
  MdSchedule,
  MdSearch,
  MdClose,
  MdRemove,
  MdPerson,
  MdShoppingCart,
  
  MdNotes,
  MdVisibility
} from 'react-icons/md';
import type { PaymentMethod } from '../types/paymentMethod';
import { paymentMethodService } from '../services/paymentMethodService';
import type { DeliveryDriver } from '../types/deliveryDriver';
import { deliveryDriverService } from '../services/deliveryDriverService';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: typeof MdRestaurant }> = {
  kitchen: { label: 'Cozinha', color: 'bg-orange-100 border-orange-300 text-orange-800', icon: MdRestaurant },
  waiting_delivery: { label: 'Aguardando Entrega', color: 'bg-yellow-100 border-yellow-300 text-yellow-800', icon: MdSchedule },
  in_delivery: { label: 'Em Entrega', color: 'bg-blue-100 border-blue-300 text-blue-800', icon: MdLocalShipping },
  completed: { label: 'Concluído', color: 'bg-green-100 border-green-300 text-green-800', icon: MdCheckCircle },
};

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [now, setNow] = useState<number>(Date.now());

  // Fast order data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [selectedCustomerAddresses, setSelectedCustomerAddresses] = useState<Customer['addresses']>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<number | undefined>(undefined);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressText, setNewAddressText] = useState('');
  const [newAddressAreaId, setNewAddressAreaId] = useState<string>('');
  const [products, setProducts] = useState<PdvProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [noteModalProduct, setNoteModalProduct] = useState<PdvProduct | null>(null);
  const [noteText, setNoteText] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [driverQueryByOrder, setDriverQueryByOrder] = useState<Record<string, string>>({});
  const [driverDropdownOpen, setDriverDropdownOpen] = useState<Record<string, boolean>>({});
  const [paymentQueryByOrder, setPaymentQueryByOrder] = useState<Record<string, string>>({});
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState<Record<string, boolean>>({});

  type PaymentOption = { id: string; kind: 'credit' | 'debit' | 'pix' | 'cash' | 'other'; label: string };
  const buildPaymentOptions = useMemo<PaymentOption[]>(() => {
    return paymentMethods.flatMap<PaymentOption>(pm => {
      const type = (pm as any).type || pm.name;
      if (String(type).toLowerCase() === 'maquininha') {
        return [
          { id: String(pm.id), kind: 'credit' as const, label: `${pm.name} - Crédito` },
          { id: String(pm.id), kind: 'debit' as const, label: `${pm.name} - Débito` },
          { id: String(pm.id), kind: 'pix' as const, label: `${pm.name} - Pix` },
        ];
      }
      if (String(type).toLowerCase() === 'dinheiro') {
        return [{ id: String(pm.id), kind: 'cash' as const, label: 'Dinheiro' }];
      }
      return [{ id: String(pm.id), kind: 'other' as const, label: pm.name }];
    });
  }, [paymentMethods]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('');
  const [cashChangeAmount, setCashChangeAmount] = useState<string>('');
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  // legacy state (removed dedicated edit modal)
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [isWalkIn, setIsWalkIn] = useState<boolean>(false);

  // Open fast order modal prefilled to edit an existing order
  const startEditOrder = async (order: Order) => {
    setEditOrderId(order.id);
    await loadNewOrderData();
    try {
      // Prefill customer reliably (independente do estado atual de customers)
      if (order.customerId) {
        setIsWalkIn(false);
        const customer = await customerService.getById(String(order.customerId));
        if (customer) {
          setSelectedCustomerId(String(customer.id));
          setCustomerQuery(`${customer.name}${customer.phone ? ' - ' + customer.phone : ''}`);
          const addresses = customer.addresses || [];
          setSelectedCustomerAddresses(addresses);
          // Match address by deliveryAreaId if possible
          if (order.deliveryAreaId) {
            const idx = addresses.findIndex(a => String(a.deliveryAreaId) === String(order.deliveryAreaId));
            if (idx >= 0) {
              setSelectedAddressIndex(idx);
            } else if (addresses.length > 0) {
              setSelectedAddressIndex(0);
            } else {
              setSelectedAddressIndex(undefined);
            }
          } else {
            setSelectedAddressIndex(addresses.length > 0 ? 0 : undefined);
          }
        } else {
          setSelectedCustomerId(undefined);
          setCustomerQuery('');
          setSelectedCustomerAddresses([]);
          setSelectedAddressIndex(undefined);
        }
      } else {
        setIsWalkIn(true);
        setSelectedCustomerId(undefined);
        setCustomerQuery('');
        setSelectedCustomerAddresses([]);
        setSelectedAddressIndex(undefined);
      }

      // Prefill area (bairro)
      if (order.deliveryAreaId) {
        setSelectedAreaId(String(order.deliveryAreaId));
      } else {
        setSelectedAreaId(undefined);
      }

      // Prefill items into cart
      const nextCart: Record<string, CartItem> = {};
      (order.items || []).forEach(it => {
        const key = String(it.productId);
        nextCart[key] = {
          productId: String(it.productId),
          productName: it.productName,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
        };
      });
      setCart(nextCart);

      // Prefill notes and payment
      setNotes(order.notes || '');
      setSelectedPaymentMethodId(order.paymentMethodId ? String(order.paymentMethodId) : '');

      setShowNewOrder(true);
    } catch (e) {
      console.error('Erro ao carregar dados do cliente para edição', e);
      setShowNewOrder(true);
    }
  };

  type CartItem = { productId: string; productName: string; unitPrice: number; quantity: number; notes?: string };
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(undefined);
  // driver and payment will be defined later in the flow
  const [notes, setNotes] = useState('');
  const selectedCustomerName = useMemo(() => {
    if (!selectedCustomerId) return '';
    const c = customers.find(x => x.id === selectedCustomerId);
    return c?.name || '';
  }, [customers, selectedCustomerId]);
  const selectedCustomerPhone = useMemo(() => {
    if (!selectedCustomerId) return '';
    const c = customers.find(x => x.id === selectedCustomerId);
    return c?.phone || '';
  }, [customers, selectedCustomerId]);
  const selectedAddress = useMemo(() => {
    if (selectedAddressIndex === undefined) return null;
    return selectedCustomerAddresses?.[selectedAddressIndex] || null;
  }, [selectedCustomerAddresses, selectedAddressIndex]);
  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areas.find(a => String(a.id) === String(selectedAreaId)) || null;
  }, [areas, selectedAreaId]);

  useEffect(() => {
    loadData();
  }, []);

  // Tick every second for kitchen timers
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Lock body scroll when modal open
  useEffect(() => {
    if (showNewOrder) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showNewOrder]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, cust, ars, pms, drs] = await Promise.all([
        orderService.getAll(),
        customerService.getAll(),
        deliveryAreaService.getAll(),
        paymentMethodService.getAll(),
        deliveryDriverService.getAll(),
      ]);
      setOrders(data);
      setCustomers(cust);
      setAreas(ars);
      setPaymentMethods(pms);
      setDrivers(drs.filter(d => d.isActive));
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const loadNewOrderData = async () => {
    try {
      const [cust, prods, cats, ars, pms] = await Promise.all([
        customerService.getAll(),
        pdvProductService.getAll(),
        productCategoryService.getAll(),
        deliveryAreaService.getAll(),
        paymentMethodService.getAll(),
      ]);
      setCustomers(cust);
      setProducts(prods.filter(p => p.isActive));
      setCategories([{ id: 'all', name: 'Todos', isActive: true }, ...cats.filter(c => c.isActive)] as any);
      setAreas(ars);
      setPaymentMethods(pms.filter(pm => pm.isActive));
      setActiveCategory('Todos');
      setCustomerQuery('');
      setSelectedCustomerId(undefined);
      setCart({});
      setSelectedAreaId(undefined);
      setNotes('');
      setSelectedPaymentMethodId('');
      setCashChangeAmount('');
      setIsWalkIn(false);
    } catch (error) {
      console.error('Error loading fast order data:', error);
      alert('Erro ao carregar dados para novo pedido');
    }
  };

  const ordersByStatus = useMemo(() => {
    const grouped: Record<OrderStatus, Order[]> = {
      kitchen: [],
      waiting_delivery: [],
      in_delivery: [],
      completed: [],
    };
    orders.forEach(order => {
      const st = (order.status as OrderStatus);
      const safeStatus: OrderStatus = (st in grouped ? st : 'kitchen');
      grouped[safeStatus].push(order);
    });
    return grouped;
  }, [orders]);

  const filteredCustomers = useMemo(() => {
    if (!customerQuery.trim()) return [];
    const q = customerQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q)).slice(0, 8);
  }, [customers, customerQuery]);

  const visibleProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== 'Todos') {
      list = list.filter(p => (p.category || '').toLowerCase() === activeCategory.toLowerCase());
    }
    if (productQuery.trim()) {
      const q = productQuery.toLowerCase();
      list = list.filter(p => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, activeCategory, productQuery]);

  const addToCart = (product: PdvProduct, notes?: string) => {
    setCart(prev => {
      const key = notes ? `${product.id}|${notes}` : product.id;
      const existing = prev[key];
      const nextQty = (existing?.quantity || 0) + 1;
      return {
        ...prev,
        [key]: {
          productId: product.id,
          productName: product.name,
          unitPrice: product.sellingPrice,
          quantity: nextQty,
          notes,
        },
      };
    });
  };

  const incItem = (key: string) => {
    const item = cart[key];
    const product = products.find(p => p.id === item?.productId);
    if (!product) return;
    addToCart(product, item?.notes);
  };

  const decItem = (key: string) => {
    setCart(prev => {
      const item = prev[key];
      if (!item) return prev;
      const qty = item.quantity - 1;
      const copy = { ...prev } as any;
      if (qty <= 0) {
        delete copy[key];
      } else {
        copy[key] = { ...item, quantity: qty };
      }
      return copy;
    });
  };

  const cartItems = useMemo(() => Object.entries(cart).map(([key, item]) => ({ key, ...item })), [cart]);
  const subtotal = useMemo(() => cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [cartItems]);
  const deliveryFee = useMemo(() => {
    if (!selectedAreaId) return 0;
    const area = areas.find(a => String(a.id) === String(selectedAreaId));
    return area ? area.deliveryFee : 0;
  }, [selectedAreaId, areas]);
  const total = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);

  // handleCreateOrder is replaced by handleCreateOrderWithPayment
  const handleCreateOrderWithPayment = async (paymentMethodId: string, finalNotes: string, changeFor?: number, changeAmount?: number) => {
    if (cartItems.length === 0) {
      alert('Adicione ao menos um item');
      return;
    }
    try {
      await orderService.create({
        customerId: selectedCustomerId,
        deliveryAreaId: selectedAreaId,
        deliveryDriverId: undefined,
        paymentMethodId,
        changeFor,
        changeAmount,
        items: cartItems.map(ci => ({
          productId: ci.productId,
          productName: ci.productName,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
        })),
        notes: finalNotes || undefined,
      });
      setShowNewOrder(false);
      await loadData();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Erro ao criar pedido');
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerQuery(`${customer.name}${customer.phone ? ' - ' + customer.phone : ''}`);
    const addresses = customer.addresses || [];
    setSelectedCustomerAddresses(addresses);
    if (addresses.length > 0) {
      // Seleciona o primeiro por padrão e aplica área
      setSelectedAddressIndex(0);
      setSelectedAreaId(addresses[0].deliveryAreaId);
    } else {
      setSelectedAddressIndex(undefined);
      setSelectedAreaId(undefined);
    }
    setIsCreatingCustomer(false);
    setIsAddingAddress(false);
  };

  const saveNewCustomer = async () => {
    if (!newCustomerName.trim()) {
      alert('Informe o nome');
      return;
    }
    try {
      const created = await customerService.create({
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || undefined,
        addresses: [],
      });
      // atualiza lista e seleciona
      const list = await customerService.getAll();
      setCustomers(list);
      handleSelectCustomer(created);
    } catch (e) {
      console.error(e);
      alert('Erro ao cadastrar cliente');
    }
  };

  const saveNewAddress = async () => {
    if (!selectedCustomerId) {
      alert('Selecione ou cadastre um cliente');
      return;
    }
    if (!newAddressAreaId) {
      alert('Selecione a área de entrega');
      return;
    }
    try {
      const current = customers.find(c => c.id === selectedCustomerId);
      const currentAddresses = current?.addresses || [];
      const updated = await customerService.update(selectedCustomerId, {
        name: current?.name || '',
        phone: current?.phone,
        addresses: [
          ...currentAddresses,
          { address: newAddressText || undefined, deliveryAreaId: newAddressAreaId },
        ],
      });
      // refresh and select address
      const list = await customerService.getAll();
      setCustomers(list);
      const refreshed = list.find(c => c.id === updated.id)!;
      setSelectedCustomerAddresses(refreshed.addresses || []);
      const idx = (refreshed.addresses || []).length - 1;
      setSelectedAddressIndex(idx);
      setSelectedAreaId(newAddressAreaId);
      setIsAddingAddress(false);
      setNewAddressText('');
      setNewAddressAreaId('');
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar endereço');
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status do pedido');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      await orderService.delete(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Erro ao excluir pedido');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // formatDate unused (timer replaces date in header)

  const formatDuration = (ms: number) => {
    if (!isFinite(ms) || ms < 0) return '--:--';
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getOrderAddressLabel = (order: Order) => {
    const areaName = areas.find(a => String(a.id) === String(order.deliveryAreaId))?.name || order.deliveryAreaName;
    let addressText: string | undefined;
    if (order.customerId) {
      const c = customers.find(cc => String(cc.id) === String(order.customerId));
      if (c && c.addresses && order.deliveryAreaId) {
        const addr = c.addresses.find(a => String(a.deliveryAreaId) === String(order.deliveryAreaId));
        addressText = addr?.address;
      }
    }
    if (addressText && areaName) return `${addressText} - ${areaName}`;
    if (areaName) return areaName;
    return '-';
  };

  const getPaymentKind = (pmName?: string, pmType?: string) => {
    const name = (pmName || '').toLowerCase();
    if ((pmType || '').toLowerCase() === 'dinheiro') return 'Dinheiro';
    if (name.includes('crédito') || name.includes('credito')) return 'Crédito';
    if (name.includes('débito') || name.includes('debito')) return 'Débito';
    if (name.includes('pix')) return 'PIX';
    return 'Outro';
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

  return (
    <Layout>
      <div className="flex flex-col gap-6 w-full max-w-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestão de Pedidos</h1>
            <p className="text-gray-600">Gerencie os pedidos através do kanban</p>
          </div>
          <button
            onClick={async () => { setShowNewOrder(true); await loadNewOrderData(); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <MdAdd className="w-5 h-5" />
            Novo Pedido
          </button>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const statusKey = status as OrderStatus;
            const Icon = config.icon;
            const columnOrders = ordersByStatus[statusKey];

            return (
              <div key={status} className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-[calc(100vh-250px)] min-h-[600px]">
                {/* Column Header */}
                <div className={`p-3 border-b-2 ${config.color} rounded-t-lg h-16 flex items-center`}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <h2 className="font-semibold text-base">{config.label}</h2>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color.replace('bg-', 'bg-opacity-50 bg-')}`}>
                      {columnOrders.length}
                    </span>
                  </div>
                </div>

                {/* Column Content */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                  {columnOrders.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      <p className="text-sm">Nenhum pedido</p>
                    </div>
                  ) : (
                    columnOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Order Header */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold text-gray-900">
                              {(() => {
                                const createdMs = order.createdAt ? new Date(order.createdAt).getTime() : NaN;
                                const totalElapsed = isNaN(createdMs) ? NaN : now - createdMs;
                                if (statusKey === 'kitchen') {
                                  return formatDuration(totalElapsed);
                                }
                                if (statusKey === 'waiting_delivery' || statusKey === 'in_delivery') {
                                  const moved = order.updatedAt ? new Date(order.updatedAt).getTime() : createdMs;
                                  const stageElapsed = isNaN(moved) ? NaN : now - moved;
                                  return (
                                    <span className="flex items-center gap-2">
                                      <span>{formatDuration(stageElapsed)}</span>
                                      <span className="text-[10px] font-normal text-gray-500">(total {formatDuration(totalElapsed)})</span>
                                    </span>
                                  );
                                }
                                if (statusKey === 'completed') {
                                  const endMs = order.updatedAt ? new Date(order.updatedAt).getTime() : createdMs;
                                  const doneElapsed = isNaN(createdMs) || isNaN(endMs) ? NaN : Math.max(0, endMs - createdMs);
                                  return formatDuration(doneElapsed);
                                }
                                return `#${order.orderNumber || String(order.id).slice(0, 8)}`;
                              })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewOrder(order)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Ver pedido"
                            >
                              <MdVisibility className="w-4 h-4" />
                            </button>
                            {statusKey === 'kitchen' && (
                              <button
                                onClick={() => startEditOrder(order)}
                                className="text-gray-600 hover:text-gray-800"
                                title="Editar"
                              >
                                <MdEdit className="w-4 h-4" />
                              </button>
                            )}
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <MdDelete className="w-4 h-4" />
                          </button>
                          </div>
                        </div>

                        {/* Minimal info */}
                        <div className="space-y-1 mb-2">
                        {order.customerName && (
                            <div className="text-sm text-gray-800">
                            <span className="font-medium">Cliente:</span> {order.customerName}
                          </div>
                        )}
                          {statusKey !== 'completed' && (
                            <div className="text-xs text-gray-600">{getOrderAddressLabel(order)}</div>
                          )}
                          {statusKey === 'in_delivery' && (
                            <div className="text-xs text-gray-700">
                              <div className="mb-1">Entregador</div>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={driverQueryByOrder[String(order.id)] ?? (drivers.find(d => String(d.id) === String(order.deliveryDriverId))?.name || '')}
                                  onChange={(e) => setDriverQueryByOrder(prev => ({ ...prev, [String(order.id)]: e.target.value }))}
                                  onFocus={() => setDriverDropdownOpen(prev => ({ ...prev, [String(order.id)]: true }))}
                                  onBlur={() => setTimeout(() => setDriverDropdownOpen(prev => ({ ...prev, [String(order.id)]: false })), 150)}
                                  placeholder="Selecione ou pesquise..."
                                  className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {driverDropdownOpen[String(order.id)] && (
                                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-40 overflow-auto">
                                    {drivers
                                      .filter(d => {
                                        const q = (driverQueryByOrder[String(order.id)] || '').toLowerCase();
                                        return d.name.toLowerCase().includes(q);
                                      })
                                      .map(d => (
                                        <button
                                          key={d.id}
                                          type="button"
                                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                          onMouseDown={async () => {
                                            await orderService.update(order.id, { deliveryDriverId: String(d.id) });
                                            setDriverQueryByOrder(prev => ({ ...prev, [String(order.id)]: d.name }));
                                            setDriverDropdownOpen(prev => ({ ...prev, [String(order.id)]: false }));
                                            await loadData();
                                          }}
                                        >
                                          {d.name}
                                        </button>
                                      ))}
                                    {drivers.filter(d => {
                                      const q = (driverQueryByOrder[String(order.id)] || '').toLowerCase();
                                      return d.name.toLowerCase().includes(q);
                                    }).length === 0 && (
                                      <div className="px-3 py-2 text-xs text-gray-500">Nenhum entregador</div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2">
                                <div className="mb-1">Forma de pagamento</div>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={paymentQueryByOrder[String(order.id)] ?? (() => {
                                      const pm = paymentMethods.find(p => String(p.id) === String(order.paymentMethodId));
                                      if (!pm) return '';
                                      const kind = order.paymentMethodKind;
                                      if (kind === 'credit') return `${pm.name} - Crédito`;
                                      if (kind === 'debit') return `${pm.name} - Débito`;
                                      if (kind === 'pix') return `${pm.name} - Pix`;
                                      if (kind === 'cash') return 'Dinheiro';
                                      return pm.name;
                                    })()}
                                    onChange={(e) => setPaymentQueryByOrder(prev => ({ ...prev, [String(order.id)]: e.target.value }))}
                                    onFocus={() => setPaymentDropdownOpen(prev => ({ ...prev, [String(order.id)]: true }))}
                                    onBlur={() => setTimeout(() => setPaymentDropdownOpen(prev => ({ ...prev, [String(order.id)]: false })), 150)}
                                    placeholder="Selecione ou pesquise..."
                                    className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  {paymentDropdownOpen[String(order.id)] && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto">
                                      {buildPaymentOptions
                                        .filter(opt => {
                                          const q = (paymentQueryByOrder[String(order.id)] || '').toLowerCase();
                                          return opt.label.toLowerCase().includes(q);
                                        })
                                        .map(opt => (
                                          <button
                                            key={`${opt.id}-${opt.kind}`}
                                            type="button"
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                            onMouseDown={async () => {
                                              await orderService.update(order.id, { paymentMethodId: String(opt.id), paymentMethodKind: opt.kind as any });
                                              setPaymentQueryByOrder(prev => ({ ...prev, [String(order.id)]: opt.label }));
                                              setPaymentDropdownOpen(prev => ({ ...prev, [String(order.id)]: false }));
                                              await loadData();
                                            }}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      {buildPaymentOptions.filter(opt => {
                                        const q = (paymentQueryByOrder[String(order.id)] || '').toLowerCase();
                                        return opt.label.toLowerCase().includes(q);
                                      }).length === 0 && (
                                        <div className="px-3 py-2 text-xs text-gray-500">Nenhuma forma cadastrada</div>
                                      )}
                              </div>
                            )}
                          </div>
                        </div>
                          </div>
                        )}
                          {statusKey !== 'kitchen' && statusKey !== 'completed' && (
                            <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                              {(() => {
                                // Mostrar "Receber R$ X"; não exibir forma de pagamento nem "Enviar ..."
                                const pm = paymentMethods.find(pm => String(pm.id) === String(order.paymentMethodId));
                                const changeFor = typeof order.changeFor === 'number' ? order.changeFor : 0;
                                const toReceive = pm?.requiresChange && changeFor > 0 ? changeFor : order.total;
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 border border-green-300">
                                    Receber {formatCurrency(toReceive)}
                                  </span>
                                );
                              })()}
                            </div>
                            )}
                          </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-3">
                          {statusKey !== 'kitchen' && (
                            <button
                              onClick={() => {
                                const prevStatus: OrderStatus[] = ['kitchen', 'waiting_delivery', 'in_delivery', 'completed'];
                                const currentIndex = prevStatus.indexOf(statusKey);
                                if (currentIndex > 0) {
                                  handleStatusChange(order.id, prevStatus[currentIndex - 1]);
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                            >
                              <MdArrowBack className="w-4 h-4" />
                              Anterior
                            </button>
                          )}
                          {statusKey !== 'completed' && (
                            <button
                              onClick={() => {
                                const nextStatus: OrderStatus[] = ['kitchen', 'waiting_delivery', 'in_delivery', 'completed'];
                                const currentIndex = nextStatus.indexOf(statusKey);
                                if (currentIndex < nextStatus.length - 1) {
                                  const target = nextStatus[currentIndex + 1];
                                  // Block going to completed without delivery driver
                                  if (target === 'completed' && !order.deliveryDriverId) {
                                    alert('Selecione um entregador antes de concluir.');
                                    return;
                                  }
                                  handleStatusChange(order.id, target);
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            >
                              Próximo
                              <MdArrowForward className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showNewOrder && (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setShowNewOrder(false)} />
            <div className="relative bg-white w-screen h-screen rounded-none shadow-xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="relative z-50 bg-white flex items-center justify-between p-4 border-b shrink-0">
                <div className="flex items-center gap-2 text-gray-800">
                  <MdShoppingCart className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Novo Pedido Rápido</h3>
                </div>
                <button onClick={() => setShowNewOrder(false)} className="text-gray-500 hover:text-gray-700">
                  <MdClose className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-hidden p-4 relative">
                {showCartDetails && (
                  <div className="absolute inset-0 bg-black/60 z-40"></div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-4 h-full relative z-0">
                {/* Coluna 1: Cliente e Entrega/Pagamento */}
                <div className="lg:col-span-1 flex flex-col gap-4 h-full overflow-auto pr-1">
                  {/* Cliente */}
                  <div className="bg-white border rounded-lg p-4 relative">
                    <div className="flex items-center gap-2 mb-2 text-gray-800 font-medium">
                      <MdPerson className="w-4 h-4" /> Cliente
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerQuery}
                        onChange={(e) => { setCustomerQuery(e.target.value); setSelectedCustomerId(undefined); setSelectedCustomerAddresses([]); setSelectedAddressIndex(undefined); }}
                        placeholder="Buscar por nome ou telefone"
                        className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <MdSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>
                    {/* Sugestões somente quando digitando */}
                    {customerQuery.trim() && filteredCustomers.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow max-h-56 overflow-auto">
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onMouseDown={(e) => { e.preventDefault(); handleSelectCustomer(c); }}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${selectedCustomerId === c.id ? 'bg-blue-50' : ''}`}
                          >
                            <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                            {c.phone && <div className="text-xs text-gray-500">{c.phone}</div>}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Cadastrar cliente inline quando não encontrado */}
                    {customerQuery.trim() && filteredCustomers.length === 0 && !selectedCustomerId && (
                      <div className="mt-3 border rounded-lg p-3 bg-gray-50">
                        {!isCreatingCustomer ? (
                          <div className="text-sm text-gray-700">
                            Nenhum cliente encontrado.{' '}
                            <button className="text-blue-600 font-medium" onClick={() => { setIsCreatingCustomer(true); setNewCustomerName(customerQuery); }}>
                              Cadastrar agora
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-1 gap-2">
                              <input
                                type="text"
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                placeholder="Nome do cliente"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              />
                              <input
                                type="text"
                                value={newCustomerPhone}
                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                                placeholder="Telefone (opcional)"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              />
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button className="px-3 py-2 bg-gray-200 rounded-lg text-gray-700" onClick={() => setIsCreatingCustomer(false)}>Cancelar</button>
                              <button className="px-3 py-2 bg-blue-600 rounded-lg text-white" onClick={saveNewCustomer}>Salvar cliente</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Endereços do cliente selecionado */}
                    {selectedCustomerId && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-500 mb-2">Endereço de entrega</div>
                        {selectedCustomerAddresses && selectedCustomerAddresses.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedCustomerAddresses.map((addr, idx) => {
                              const areaName = areas.find(a => String(a.id) === String(addr.deliveryAreaId))?.name || 'Área';
                              const label = `${addr.address || ''} ${addr.address ? ' - ' : ''}${areaName}`.trim();
                              const active = selectedAddressIndex === idx;
                              return (
                                <button
                                  key={`${addr.deliveryAreaId}-${idx}`}
                                  onClick={() => { setSelectedAddressIndex(idx); setSelectedAreaId(addr.deliveryAreaId); }}
                                  className={`px-3 py-1.5 rounded-full border text-sm ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'}`}
                                  title={label}
                                >
                                  {label}
                                </button>
                              );
                            })}
                            <button
                              className={`px-3 py-1.5 rounded-full border text-sm ${isAddingAddress ? 'bg-green-600 text-white border-green-600' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'}`}
                              onClick={() => setIsAddingAddress(v => !v)}
                            >
                              {isAddingAddress ? 'Cancelar' : 'Adicionar endereço'}
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">
                            Nenhum endereço cadastrado.{' '}
                            <button className="text-blue-600 font-medium" onClick={() => setIsAddingAddress(true)}>Adicionar endereço</button>
                          </div>
                        )}

                        {isAddingAddress && (
                          <div className="mt-3 flex flex-col gap-2">
                            <input
                              type="text"
                              value={newAddressText}
                              onChange={(e) => setNewAddressText(e.target.value)}
                              placeholder="Endereço (rua, número, complemento)"
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <div>
                              <select
                                value={newAddressAreaId}
                                onChange={(e) => setNewAddressAreaId(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              >
                                <option value="">Selecione a área de entrega</option>
                                {areas.map(a => (
                                  <option key={a.id} value={a.id}>{a.name} (Taxa: {formatCurrency(a.deliveryFee)})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button className="px-3 py-2 bg-gray-200 rounded-lg text-gray-700" onClick={() => setIsAddingAddress(false)}>Cancelar</button>
                              <button className="px-3 py-2 bg-green-600 rounded-lg text-white" onClick={saveNewAddress}>Salvar endereço</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bloques de Entrega e Pagamento removidos por serem definidos depois */}

                  {/* Observações */}
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2 text-gray-800 font-medium">
                      <MdNotes className="w-4 h-4" /> Observações (opcional)
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Observações do pedido"
                    />
                  </div>
                </div>

                {/* Coluna 2: Produtos */}
                <div className="lg:col-span-2 h-full flex flex-col">
                  <div className="bg-white border rounded-lg p-3 shrink-0">
                    {/* Categorias */}
                    <div className="flex gap-2 flex-wrap mb-3">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveCategory(c.name)}
                          className={`px-3 py-1.5 rounded-full border text-sm ${activeCategory === c.name ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    {/* Busca de produtos */}
                    <div className="mb-3">
                      <input
                        type="text"
                        value={productQuery}
                        onChange={(e) => setProductQuery(e.target.value)}
                        placeholder="Buscar produto por código ou nome"
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>

                    {/* Grade de produtos */}
                    <div className="h-[calc(100vh-300px)] overflow-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-1">
                        {visibleProducts.map((p) => (
                          <div key={p.id} className="border rounded-lg p-3 bg-white hover:shadow transition">
                            <div className="flex items-start justify-between gap-2">
                              <button
                                onClick={() => addToCart(p)}
                                className="text-left flex-1"
                                title="Adicionar ao pedido"
                              >
                                <div className="text-sm font-medium text-gray-800 truncate">{p.code} - {p.name}</div>
                                <div className="text-xs text-gray-500">{formatCurrency(p.sellingPrice)}</div>
                              </button>
                              <button
                                onClick={() => { setNoteModalProduct(p); setNoteText(''); }}
                                className="text-gray-500 hover:text-gray-700 p-1"
                                title="Adicionar com observação"
                              >
                                <MdNotes className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {visibleProducts.length === 0 && (
                          <div className="col-span-full text-center text-sm text-gray-500 py-8">Nenhum produto</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* A barra do carrinho será renderizada como footer fixo fora desta coluna */}
                </div>
                </div>
              </div>
              {/* Painel do carrinho expandido (expande para cima) */}
              {showCartDetails && (
                <div className="border-t bg-white p-4 flex-shrink-0">
                  {cartItems.length === 0 ? (
                    <div className="text-sm text-gray-500">Nenhum item adicionado</div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                      {cartItems.map(ci => (
                        <div key={ci.key} className="flex items-center justify-between gap-2 border rounded-lg p-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-800 truncate">{ci.productName}</div>
                            {ci.notes && <div className="text-xs text-gray-500 truncate">Obs: {ci.notes}</div>}
                            <div className="text-xs text-gray-500">{formatCurrency(ci.unitPrice)}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => decItem(ci.key)} className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200">
                              <MdRemove className="w-4 h-4" />
                            </button>
                            <div className="w-8 text-center text-sm font-medium">{ci.quantity}</div>
                            <button onClick={() => incItem(ci.key)} className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-700 text-white">
                              <MdAdd className="w-4 h-4" />
                            </button>
                            <div className="w-20 text-right text-sm font-semibold">{formatCurrency(ci.quantity * ci.unitPrice)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="border-t mt-3 pt-3 flex flex-col gap-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Entrega</span>
                      <span>{formatCurrency(deliveryFee)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      onClick={() => setShowNewOrder(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Enviar Pedido
                    </button>
                  </div>
                </div>
              )}
              {/* Footer fixo com total e toggle (toda a faixa clicável) */}
              <div
                className="border-t bg-gray-50 px-4 py-3 flex items-center gap-4 flex-shrink-0 cursor-pointer select-none"
                onClick={() => setShowCartDetails(v => !v)}
                title={showCartDetails ? 'Recolher' : 'Ver detalhes'}
              >
                <div className="hidden md:block text-sm font-medium text-gray-700 min-w-[120px]">
                  {showCartDetails ? 'Recolher' : 'Resumo'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate">
                    Cliente: <span className="font-medium">{selectedCustomerName || '—'}</span>
                    {selectedCustomerPhone ? ` (${selectedCustomerPhone})` : ''}
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="truncate inline-block max-w-full align-bottom">
                      Endereço: {selectedAddress?.address || '—'}{selectedArea ? ` - ${selectedArea.name}` : ''}
                    </span>
                    {selectedArea && (
                      <span className="ml-2 whitespace-nowrap">(Taxa {formatCurrency(selectedArea.deliveryFee)})</span>
                    )}
                  </div>
                </div>
                <div className="text-base font-bold text-gray-900 whitespace-nowrap">{formatCurrency(total)}</div>
              </div>

              {/* Modal de Observação do Produto */}
              {noteModalProduct && (
                <div className="absolute inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setNoteModalProduct(null)} />
                  <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl border">
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="text-gray-800 font-semibold text-base">Adicionar observação</div>
                      <button className="text-gray-500 hover:text-gray-700" onClick={() => setNoteModalProduct(null)}>
                        <MdClose className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="text-sm text-gray-700 mb-2 truncate">{noteModalProduct.code} - {noteModalProduct.name}</div>
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        rows={4}
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        placeholder="Ex.: sem cebola, ponto da carne, retirar picles..."
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
                      <button
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        onClick={() => setNoteModalProduct(null)}
                      >
                        Cancelar
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        onClick={() => {
                          if (!noteModalProduct) return;
                          const text = noteText.trim();
                          if (text) addToCart(noteModalProduct, text);
                          setNoteText('');
                          setNoteModalProduct(null);
                        }}
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de Pagamento */}
              {showPaymentModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setShowPaymentModal(false)} />
                  <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl border">
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="text-gray-800 font-semibold text-base">Finalizar pagamento</div>
                      <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowPaymentModal(false)}>
                        <MdClose className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="text-sm text-gray-700 mb-3">Selecione a forma de pagamento</div>
                      <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                        {paymentMethods.map(pm => (
                          <label key={pm.id} className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={pm.id}
                              checked={selectedPaymentMethodId === pm.id}
                              onChange={() => setSelectedPaymentMethodId(pm.id)}
                            />
                            <span className="text-sm text-gray-800">{pm.name}</span>
                          </label>
                        ))}
                        {paymentMethods.length === 0 && (
                          <div className="text-xs text-gray-500">Nenhuma forma de pagamento cadastrada</div>
                        )}
                      </div>
                      {selectedPaymentMethodId && paymentMethods.find(pm => pm.id === selectedPaymentMethodId)?.requiresChange && (
                        <div className="mt-3">
                          <label className="block text-xs text-gray-600 mb-1">Troco para quanto? (opcional)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cashChangeAmount}
                            onChange={(e) => setCashChangeAmount(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            placeholder="Ex.: 100,00"
                          />
                          {editOrderId && cashChangeAmount && (
                            <div className="mt-2 text-sm text-gray-700">
                              {(() => {
                                const given = parseFloat(cashChangeAmount || '0') || 0;
                                const change = Math.max(0, given - total);
                                return <div>Enviar de troco: <span className="font-semibold">{formatCurrency(change)}</span></div>;
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
                      <button
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        onClick={() => setShowPaymentModal(false)}
                      >
                        Voltar
                      </button>
                      <button
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        disabled={!selectedPaymentMethodId}
                        onClick={async () => {
                          setShowPaymentModal(false);
                          if (editOrderId) {
                            // Atualiza pedido existente
                            await orderService.update(editOrderId, {
                              customerId: selectedCustomerId,
                              deliveryAreaId: selectedAreaId,
                              paymentMethodId: selectedPaymentMethodId,
                              ...(paymentMethods.find(p => p.id === selectedPaymentMethodId)?.requiresChange && cashChangeAmount.trim()
                                ? { changeFor: Number(cashChangeAmount), changeAmount: Math.max(0, (parseFloat(cashChangeAmount || '0') || 0) - total) }
                                : {}),
                              items: cartItems.map(ci => ({
                                productId: ci.productId,
                                productName: ci.productName,
                                quantity: ci.quantity,
                                unitPrice: ci.unitPrice,
                              })) as any,
                              notes: notes || undefined,
                            });
                            setShowNewOrder(false);
                            setEditOrderId(null);
                            await loadData();
                          } else {
                            // Create new order with change info when applicable
                            const requires = paymentMethods.find(p => p.id === selectedPaymentMethodId)?.requiresChange;
                            const changeFor = requires && cashChangeAmount.trim() ? Number(cashChangeAmount) : undefined;
                            const changeAmount = requires && changeFor ? Math.max(0, changeFor - total) : undefined;
                            await handleCreateOrderWithPayment(selectedPaymentMethodId, notes || '', changeFor, changeAmount);
                          }
                        }}
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de Visualização do Pedido */}
              {viewOrder && (
                <div className="absolute inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={() => setViewOrder(null)} />
                  <div className="relative bg-white w-full max-w-lg mx-4 rounded-lg shadow-xl border">
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="text-gray-800 font-semibold text-base">Pedido #{viewOrder.orderNumber || String(viewOrder.id).slice(0,8)}</div>
                      <button className="text-gray-500 hover:text-gray-700" onClick={() => setViewOrder(null)}>
                        <MdClose className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      <div className="text-sm text-gray-800"><span className="font-medium">Cliente:</span> {viewOrder.customerName || '—'}</div>
                      <div className="text-sm text-gray-700">{viewOrder.deliveryAreaName || '—'}</div>
                      <div className="text-sm text-gray-700">{viewOrder.paymentMethodName || '—'}</div>
                      <div className="border-t pt-3">
                        <div className="text-xs font-medium text-gray-600 mb-2">Itens</div>
                        <div className="flex flex-col gap-1 max-h-60 overflow-auto">
                          {(viewOrder.items || []).map((it, idx) => (
                            <div key={idx} className="text-xs text-gray-700">
                              {it.quantity}x {it.productName} — {formatCurrency(it.unitPrice * it.quantity)}
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 text-sm flex justify-between text-gray-800">
                          <span>Total</span>
                          <span className="font-bold">{formatCurrency(viewOrder.total)}</span>
                        </div>
                      </div>
                      {viewOrder.notes && (
                        <div className="text-xs text-gray-600 p-2 bg-gray-50 rounded">{viewOrder.notes}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de edição dedicado removido; edição usa a tela de pedido rápido reaberta */}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Modal de Novo Pedido Rápido
// Mantido no mesmo arquivo por simplicidade
export default Orders;

// Modal de observação do produto (renderizado dentro do mesmo arquivo)
