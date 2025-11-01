import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import type { Order, OrderStatus } from "../types/order";
import { orderService } from "../services/orderService";
import { confirmAsync, notifySuccess, notifyError } from "../utils/alerts";
import { cashRegisterService } from "../services/cashRegisterService";
import type { Customer } from "../types/customer";
import { customerService } from "../services/customerService";
import type { PdvProduct } from "../types/pdvProduct";
import { pdvProductService } from "../services/pdvProductService";
import type { ProductCategory } from "../types/productCategory";
import { productCategoryService } from "../services/productCategoryService";
import type { DeliveryArea } from "../types/deliveryArea";
import { deliveryAreaService } from "../services/deliveryAreaService";
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
  MdAttachMoney,
  MdNotes,
  MdVisibility,
  MdStore,
  MdShoppingBag,
  MdHistory,
} from "react-icons/md";
import type { PaymentMethod } from "../types/paymentMethod";
import { paymentMethodService } from "../services/paymentMethodService";
import type { DeliveryDriver } from "../types/deliveryDriver";
import { deliveryDriverService } from "../services/deliveryDriverService";

const STATUS_CONFIG: Partial<
  Record<
    OrderStatus,
    { label: string; color: string; icon: typeof MdRestaurant }
  >
> = {
  kitchen: {
    label: "Cozinha",
    color: "bg-orange-100 border-orange-300 text-orange-800",
    icon: MdRestaurant,
  },
  waiting_delivery: {
    label: "Aguardando Entrega/Retirada",
    color: "bg-yellow-100 border-yellow-300 text-yellow-800",
    icon: MdSchedule,
  },
  in_delivery: {
    label: "Em Entrega",
    color: "bg-blue-100 border-blue-300 text-blue-800",
    icon: MdLocalShipping,
  },
  completed: {
    label: "Concluído",
    color: "bg-green-100 border-green-300 text-green-800",
    icon: MdCheckCircle,
  },
};

export function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [now, setNow] = useState<number>(Date.now());
  const [cashRegisterOpen, setCashRegisterOpen] = useState<boolean | null>(
    null
  );
  const [openCashRegisterId, setOpenCashRegisterId] = useState<string | null>(
    null
  );
  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [cashOpeningBalance, setCashOpeningBalance] = useState("");
  const [cashNotes, setCashNotes] = useState("");

  // Fast order data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<
    string | undefined
  >(undefined);
  const [selectedCustomerAddresses, setSelectedCustomerAddresses] = useState<
    Customer["addresses"]
  >([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState<
    number | undefined
  >(undefined);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddressText, setNewAddressText] = useState("");
  const [newAddressAreaId, setNewAddressAreaId] = useState<string>("");
  const [products, setProducts] = useState<PdvProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [showCartDetails, setShowCartDetails] = useState(false);
  const [noteModalProduct, setNoteModalProduct] = useState<PdvProduct | null>(
    null
  );
  const [noteText, setNoteText] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [driverQueryByOrder, setDriverQueryByOrder] = useState<
    Record<string, string>
  >({});
  const [driverDropdownOpen, setDriverDropdownOpen] = useState<
    Record<string, boolean>
  >({});
  const [cashChangeByOrder, setCashChangeByOrder] = useState<
    Record<string, string>
  >({});
  const [paymentQueryByOrder, setPaymentQueryByOrder] = useState<
    Record<string, string>
  >({});
  const [paymentDropdownOpen, setPaymentDropdownOpen] = useState<
    Record<string, boolean>
  >({});

  type PaymentOption = {
    id: string;
    kind: "credit" | "debit" | "pix" | "cash" | "other";
    label: string;
  };
  const buildPaymentOptions = useMemo<PaymentOption[]>(() => {
    const fmtPct = (v?: number) =>
      typeof v === "number" ? ` (${v.toFixed(2)}%)` : "";
    return paymentMethods.flatMap<PaymentOption>((pm) => {
      const type = (pm as any).type || pm.name;
      if (String(type).toLowerCase() === "maquininha") {
        return [
          {
            id: String(pm.id),
            kind: "credit" as const,
            label: `${pm.name} - Crédito${fmtPct(pm.creditFee)}`,
          },
          {
            id: String(pm.id),
            kind: "debit" as const,
            label: `${pm.name} - Débito${fmtPct(pm.debitFee)}`,
          },
          {
            id: String(pm.id),
            kind: "pix" as const,
            label: `${pm.name} - Pix${fmtPct(pm.processingFeePercentage)}`,
          },
        ];
      }
      if (String(type).toLowerCase() === "dinheiro") {
        return [
          { id: String(pm.id), kind: "cash" as const, label: "Dinheiro" },
        ];
      }
      return [{ id: String(pm.id), kind: "other" as const, label: pm.name }];
    });
  }, [paymentMethods]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>("");
  const [selectedPaymentKind, setSelectedPaymentKind] = useState<
    "credit" | "debit" | "pix" | "cash" | "other" | ""
  >("");
  const [cashChangeAmount, setCashChangeAmount] = useState<string>("");
  const [paymentSearch, setPaymentSearch] = useState<string>("");
  const [paymentOptionsOpen, setPaymentOptionsOpen] = useState<boolean>(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  // legacy state (removed dedicated edit modal)
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [customerHistoryModal, setCustomerHistoryModal] = useState<{
    customerId: string;
    customerName: string;
  } | null>(null);
  const [customerHistoryOrders, setCustomerHistoryOrders] = useState<Order[]>([]);
  const [loadingCustomerHistory, setLoadingCustomerHistory] = useState(false);
  // Order type: counter, pickup, or delivery
  const [orderType, setOrderType] = useState<'counter' | 'pickup' | 'delivery'>('delivery');
  // Customer name/phone for auto-create
  const [customerNameInput, setCustomerNameInput] = useState<string>('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState<string>('');
  // Items selection for replication
  const [selectedItemsForReplication, setSelectedItemsForReplication] = useState<Set<number>>(new Set());

  // Open fast order modal prefilled to edit an existing order
  const startEditOrder = async (order: Order) => {
    setEditOrderId(order.id);
    await loadNewOrderData();
    try {
      // Prefill customer reliably (independente do estado atual de customers)
      if (order.customerId) {
        const customer = await customerService.getById(
          String(order.customerId)
        );
        if (customer) {
          setSelectedCustomerId(String(customer.id));
          setCustomerQuery(
            `${customer.name}${customer.phone ? " - " + customer.phone : ""}`
          );
          const addresses = customer.addresses || [];
          setSelectedCustomerAddresses(addresses);
          // Match address by deliveryAreaId if possible
          if (order.deliveryAreaId) {
            const idx = addresses.findIndex(
              (a) => String(a.deliveryAreaId) === String(order.deliveryAreaId)
            );
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
          setCustomerQuery("");
          setSelectedCustomerAddresses([]);
          setSelectedAddressIndex(undefined);
        }
      } else {
        setSelectedCustomerId(undefined);
        setCustomerQuery("");
        setSelectedCustomerAddresses([]);
        setSelectedAddressIndex(undefined);
      }

      // Prefill area (bairro) and order type
      if (order.deliveryAreaId) {
        setSelectedAreaId(String(order.deliveryAreaId));
        setOrderType('delivery');
      } else {
        setSelectedAreaId(undefined);
        // Assume counter if no delivery area (could be pickup too, but counter is safer default)
        setOrderType('counter');
      }
      
      setCustomerNameInput('');
      setCustomerPhoneInput('');

      // Prefill items into cart
      const nextCart: Record<string, CartItem> = {};
      (order.items || []).forEach((it) => {
        const key = it.notes ? `${it.productId}|${it.notes}` : String(it.productId);
        nextCart[key] = {
          productId: String(it.productId),
          productName: it.productName,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          notes: it.notes,
        };
      });
      setCart(nextCart);

      // Prefill notes and payment
      setNotes(order.notes || "");
      setSelectedPaymentMethodId(
        order.paymentMethodId ? String(order.paymentMethodId) : ""
      );
      
      // Prefill payment kind if exists
      if (order.paymentMethodKind) {
        // Find the payment method to get its kind options
        const pm = paymentMethods.find(
          (p) => String(p.id) === String(order.paymentMethodId)
        );
        // If it's cash or the kind matches, set it
        if (order.paymentMethodKind === "cash") {
          setSelectedPaymentKind("cash");
        } else if (pm) {
          // For other kinds, try to match
          setSelectedPaymentKind(order.paymentMethodKind as any);
        }
      }
      
      // Prefill change amount if exists
      if (typeof order.changeFor === "number" && order.changeFor > 0) {
        setCashChangeAmount(String(order.changeFor));
      }

      setShowNewOrder(true);
    } catch (e) {
      console.error("Erro ao carregar dados do cliente para edição", e);
      setShowNewOrder(true);
    }
  };

  type CartItem = {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    notes?: string;
  };
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [selectedAreaId, setSelectedAreaId] = useState<string | undefined>(
    undefined
  );
  // driver and payment will be defined later in the flow
  const [notes, setNotes] = useState("");
  const selectedCustomerName = useMemo(() => {
    if (!selectedCustomerId) return "";
    const c = customers.find((x) => x.id === selectedCustomerId);
    return c?.name || "";
  }, [customers, selectedCustomerId]);
  const selectedCustomerPhone = useMemo(() => {
    if (!selectedCustomerId) return "";
    const c = customers.find((x) => x.id === selectedCustomerId);
    return c?.phone || "";
  }, [customers, selectedCustomerId]);
  const selectedAddress = useMemo(() => {
    if (selectedAddressIndex === undefined) return null;
    return selectedCustomerAddresses?.[selectedAddressIndex] || null;
  }, [selectedCustomerAddresses, selectedAddressIndex]);
  const selectedArea = useMemo(() => {
    if (!selectedAreaId) return null;
    return areas.find((a) => String(a.id) === String(selectedAreaId)) || null;
  }, [areas, selectedAreaId]);

  useEffect(() => {
    checkCashRegister();
    loadData();
  }, []);

  const checkCashRegister = async () => {
    try {
      const openCash = await cashRegisterService.getOpenCashRegister();
      setCashRegisterOpen(!!openCash);
      setOpenCashRegisterId(openCash ? String(openCash.id) : null);
    } catch (error) {
      console.error("Error checking cash register:", error);
      setCashRegisterOpen(false);
      setOpenCashRegisterId(null);
    }
  };

  // Tick every second for kitchen timers
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Lock body scroll when modal open
  useEffect(() => {
    if (showNewOrder) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
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
      setDrivers(drs.filter((d) => d.isActive));
    } catch (error) {
      console.error("Error loading orders:", error);
      alert("Erro ao carregar pedidos");
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
      setProducts(prods.filter((p) => p.isActive));
      setCategories([
        { id: "all", name: "Todos", isActive: true },
        ...cats.filter((c) => c.isActive),
      ] as any);
      setAreas(ars);
      setPaymentMethods(pms.filter((pm) => pm.isActive));
      setActiveCategory("Todos");
      setCustomerQuery("");
      setSelectedCustomerId(undefined);
      setCart({});
      setSelectedAreaId(undefined);
      setNotes("");
      setSelectedPaymentMethodId("");
      setCashChangeAmount("");
      setOrderType('delivery');
      setCustomerNameInput('');
      setCustomerPhoneInput('');
    } catch (error) {
      console.error("Error loading fast order data:", error);
      alert("Erro ao carregar dados para novo pedido");
    }
  };

  const ordersByStatus = useMemo(() => {
    const grouped: Partial<Record<OrderStatus, Order[]>> = {
      kitchen: [],
      waiting_delivery: [],
      in_delivery: [],
      completed: [],
    };
    const visible = openCashRegisterId
      ? orders.filter(
          (o) => String(o.cashRegisterId) === String(openCashRegisterId)
        )
      : [];
    visible.forEach((order) => {
      const st = order.status as OrderStatus;
      if (st === "cancelled") return; // não exibir cancelados no quadro
      const safeStatus: OrderStatus = st in grouped ? st : "kitchen";
      (grouped[safeStatus] as Order[]).push(order);
    });
    return grouped;
  }, [orders, openCashRegisterId]);

  const filteredCustomers = useMemo(() => {
    if (!customerQuery.trim()) return [];
    const q = customerQuery.toLowerCase();
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [customers, customerQuery]);

  const visibleProducts = useMemo(() => {
    let list = products;
    if (activeCategory !== "Todos") {
      list = list.filter(
        (p) => (p.category || "").toLowerCase() === activeCategory.toLowerCase()
      );
    }
    if (productQuery.trim()) {
      const q = productQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, productQuery]);

  const addToCart = (product: PdvProduct, notes?: string) => {
    setCart((prev) => {
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
    const product = products.find((p) => p.id === item?.productId);
    if (!product) return;
    addToCart(product, item?.notes);
  };

  // Replicate full order to cart
  const handleReplicateFullOrder = async (order: Order) => {
    if (!viewOrder) return;
    
    try {
      // Load products if not loaded
      if (products.length === 0) {
        await loadNewOrderData();
      }
      
      // Wait a bit for products to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Clear current cart
      setCart({});
      
      // Get fresh products list
      const prods = await pdvProductService.getAll();
      const activeProds = prods.filter((p) => p.isActive);
      
      // Add all items to cart with their notes
      order.items.forEach((item) => {
        const product = activeProds.find((p) => String(p.id) === String(item.productId));
        if (product) {
          // Add item multiple times if quantity > 1
          for (let i = 0; i < item.quantity; i++) {
            addToCart(product, item.notes);
          }
        }
      });
      
      // Set order notes if exists
      if (order.notes) {
        setNotes(order.notes);
      }
      
      // Close modal and open new order screen
      setViewOrder(null);
      setShowNewOrder(true);
      
      notifySuccess("Pedido replicado com sucesso!");
    } catch (error) {
      console.error("Error replicating order:", error);
      notifyError("Erro ao replicar pedido");
    }
  };

  // Replicate selected items to cart
  const handleReplicateSelectedItems = async (order: Order) => {
    if (!viewOrder || selectedItemsForReplication.size === 0) {
      alert("Selecione pelo menos um item para replicar");
      return;
    }
    
    try {
      // Load products if not loaded
      if (products.length === 0) {
        await loadNewOrderData();
      }
      
      // Wait a bit for products to be set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get fresh products list
      const prods = await pdvProductService.getAll();
      const activeProds = prods.filter((p) => p.isActive);
      
      // Add selected items to cart with their notes
      const selectedIndices = Array.from(selectedItemsForReplication);
      selectedIndices.forEach((index) => {
        const item = order.items[index];
        if (item) {
          const product = activeProds.find((p) => String(p.id) === String(item.productId));
          if (product) {
            // Add item multiple times if quantity > 1
            for (let i = 0; i < item.quantity; i++) {
              addToCart(product, item.notes);
            }
          }
        }
      });
      
      // Clear selection
      setSelectedItemsForReplication(new Set());
      
      // Close modal and open new order screen
      setViewOrder(null);
      setShowNewOrder(true);
      
      notifySuccess(`${selectedIndices.length} item(ns) replicado(s) com sucesso!`);
    } catch (error) {
      console.error("Error replicating selected items:", error);
      notifyError("Erro ao replicar itens selecionados");
    }
  };

  // Toggle item selection for replication
  const toggleItemSelection = (index: number) => {
    setSelectedItemsForReplication((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const decItem = (key: string) => {
    setCart((prev) => {
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

  const cartItems = useMemo(
    () => Object.entries(cart).map(([key, item]) => ({ key, ...item })),
    [cart]
  );
  const subtotal = useMemo(
    () => cartItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    [cartItems]
  );
  const deliveryFee = useMemo(() => {
    if (orderType !== 'delivery') return 0;
    if (!selectedAreaId) return 0;
    const area = areas.find((a) => String(a.id) === String(selectedAreaId));
    return area ? area.deliveryFee : 0;
  }, [orderType, selectedAreaId, areas]);
  const total = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);

  // Auto-create customer if name is entered but not found
  const handleCustomerInputChange = (value: string) => {
    setCustomerQuery(value);
    
    // Clear selection when typing
    setSelectedCustomerId(undefined);
    setSelectedCustomerAddresses([]);
    setSelectedAddressIndex(undefined);
    setCustomerNameInput(value.trim());
    
    // Try to find customer in the list
    const found = customers.find(
      c => c.name.toLowerCase() === value.toLowerCase().trim() ||
      (c.phone && c.phone.includes(value))
    );
    
    if (found) {
      // If found, select it
      handleSelectCustomer(found);
    }
  };

  // handleCreateOrder is replaced by handleCreateOrderWithPayment
  const handleCreateOrderWithPayment = async (
    paymentMethodId: string,
    finalNotes: string,
    changeFor?: number,
    changeAmount?: number
  ) => {
    if (cartItems.length === 0) {
      alert("Adicione ao menos um item");
      return;
    }
    
    // Auto-create customer if needed
    let finalCustomerId = selectedCustomerId;
    
    if (!finalCustomerId && customerNameInput.trim()) {
      // For delivery, phone is required
      if (orderType === 'delivery') {
        if (!customerPhoneInput.trim()) {
          alert("Para pedidos de entrega, é necessário informar o telefone do cliente");
          return;
        }
      }
      
      try {
        // Auto-create customer
        const created = await customerService.create({
          name: customerNameInput.trim(),
          phone: customerPhoneInput.trim() || undefined,
          addresses: orderType === 'delivery' && selectedAreaId ? [{
            deliveryAreaId: selectedAreaId,
            address: undefined,
          }] : [],
        });
        
        // Refresh customers list
        const updatedCustomers = await customerService.getAll();
        setCustomers(updatedCustomers);
        
        // Select the created customer
        finalCustomerId = created.id;
        setSelectedCustomerId(created.id);
        setCustomerQuery(`${created.name}${created.phone ? ' - ' + created.phone : ''}`);
        
        const addresses = created.addresses || [];
        setSelectedCustomerAddresses(addresses);
        if (addresses.length > 0 && orderType === 'delivery') {
          setSelectedAddressIndex(0);
          setSelectedAreaId(addresses[0].deliveryAreaId);
        }
      } catch (error) {
        console.error("Error auto-creating customer:", error);
        alert("Erro ao cadastrar cliente automaticamente");
        return;
      }
    } else if (orderType === 'delivery' && !finalCustomerId) {
      alert("Selecione ou informe um cliente para entrega");
      return;
    }
    
    try {
      await orderService.create({
        customerId: finalCustomerId,
        deliveryAreaId: orderType === 'delivery' ? selectedAreaId : undefined,
        deliveryDriverId: undefined,
        paymentMethodId,
        paymentMethodKind: (selectedPaymentKind || "other") as any,
        changeFor,
        changeAmount,
        items: cartItems.map((ci) => ({
          productId: ci.productId,
          productName: ci.productName,
          quantity: ci.quantity,
          unitPrice: ci.unitPrice,
          notes: ci.notes,
        })),
        notes: finalNotes || undefined,
      });
      setShowNewOrder(false);
      await loadData();
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Erro ao criar pedido");
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerQuery(
      `${customer.name}${customer.phone ? " - " + customer.phone : ""}`
    );
    setCustomerNameInput('');
    setCustomerPhoneInput('');
    const addresses = customer.addresses || [];
    setSelectedCustomerAddresses(addresses);
    if (addresses.length > 0 && orderType === 'delivery') {
      // Seleciona o primeiro por padrão e aplica área (apenas para entrega)
      setSelectedAddressIndex(0);
      setSelectedAreaId(addresses[0].deliveryAreaId);
    } else {
      setSelectedAddressIndex(undefined);
      if (orderType === 'delivery') {
        setSelectedAreaId(undefined);
      }
    }
    setIsAddingAddress(false);
  };

  const handleViewCustomerHistory = async (customerId: string, customerName: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCustomerHistoryModal({ customerId, customerName });
    setLoadingCustomerHistory(true);
    try {
      // Buscar apenas pedidos concluídos do cliente
      const allOrders = await orderService.getAll();
      const customerOrders = allOrders.filter(
        (order) => String(order.customerId) === String(customerId) && order.status === 'completed'
      );
      // Ordenar por data de criação (mais recentes primeiro)
      customerOrders.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setCustomerHistoryOrders(customerOrders);
    } catch (error) {
      console.error('Error loading customer history:', error);
      notifyError('Erro ao carregar histórico do cliente');
    } finally {
      setLoadingCustomerHistory(false);
    }
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId(undefined);
    setSelectedCustomerAddresses([]);
    setSelectedAddressIndex(undefined);
    setSelectedAreaId(undefined);
    setCustomerQuery('');
    setCustomerNameInput('');
    setCustomerPhoneInput('');
    setIsAddingAddress(false);
  };

  const saveNewAddress = async () => {
    if (!selectedCustomerId) {
      alert("Selecione ou cadastre um cliente");
      return;
    }
    if (!newAddressAreaId) {
      alert("Selecione a área de entrega");
      return;
    }
    try {
      const current = customers.find((c) => c.id === selectedCustomerId);
      const currentAddresses = current?.addresses || [];
      const updated = await customerService.update(selectedCustomerId, {
        name: current?.name || "",
        phone: current?.phone,
        addresses: [
          ...currentAddresses,
          {
            address: newAddressText || undefined,
            deliveryAreaId: newAddressAreaId,
          },
        ],
      });
      // refresh and select address
      const list = await customerService.getAll();
      setCustomers(list);
      const refreshed = list.find((c) => c.id === updated.id)!;
      setSelectedCustomerAddresses(refreshed.addresses || []);
      const idx = (refreshed.addresses || []).length - 1;
      setSelectedAddressIndex(idx);
      setSelectedAreaId(newAddressAreaId);
      setIsAddingAddress(false);
      setNewAddressText("");
      setNewAddressAreaId("");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar endereço");
    }
  };

  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus
  ) => {
    try {
      await orderService.updateStatus(orderId, newStatus);
      await loadData();
    } catch (error) {
      console.error("Error updating status:", error);
      notifyError("Erro ao atualizar status do pedido");
    }
  };

  const handleCancel = async (id: string) => {
    const ok = await confirmAsync(
      "Tem certeza que deseja cancelar este pedido?"
    );
    if (!ok) return;
    try {
      await orderService.updateStatus(id, "cancelled");
      await loadData();
      notifySuccess("Pedido cancelado.");
    } catch (error) {
      console.error("Error cancelling order:", error);
      notifyError("Erro ao cancelar pedido");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // formatDate unused (timer replaces date in header)

  const formatDuration = (ms: number) => {
    if (!isFinite(ms) || ms < 0) return "--:--";
    const totalSec = Math.floor(ms / 1000);
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  };

  const getOrderAddressLabel = (order: Order) => {
    const areaName =
      areas.find((a) => String(a.id) === String(order.deliveryAreaId))?.name ||
      order.deliveryAreaName;
    let addressText: string | undefined;
    if (order.customerId) {
      const c = customers.find(
        (cc) => String(cc.id) === String(order.customerId)
      );
      if (c && c.addresses && order.deliveryAreaId) {
        const addr = c.addresses.find(
          (a) => String(a.deliveryAreaId) === String(order.deliveryAreaId)
        );
        addressText = addr?.address;
      }
    }
    if (addressText && areaName) return `${addressText} - ${areaName}`;
    if (areaName) return areaName;
    return "-";
  };

  // removed unused helper getPaymentKind

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Carregando...</div>
        </div>
      </Layout>
    );
  }

  const handleOpenCash = async () => {
    try {
      const balance = Number(cashOpeningBalance) || 0;
      await cashRegisterService.open({
        openingBalance: balance,
        notes: cashNotes,
      });
      notifySuccess("Caixa aberto com sucesso!");
      setShowOpenCashModal(false);
      setCashOpeningBalance("");
      setCashNotes("");
      await checkCashRegister();
    } catch (error: any) {
      console.error("Error opening cash register:", error);
      notifyError(error.message || "Erro ao abrir caixa");
    }
  };

  // Se o caixa não estiver aberto, mostrar aviso
  if (cashRegisterOpen === false) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-8">
              <MdSchedule className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Caixa Fechado
              </h2>
              <p className="text-gray-600 mb-6">
                Para gerenciar pedidos, é necessário abrir o caixa primeiro.
              </p>
              <div className="flex flex-col gap-3 justify-center">
                <button
                  onClick={() => setShowOpenCashModal(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Abrir Caixa Agora
                </button>
                <button
                  onClick={() => navigate("/pdv/caixa")}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Ir para Gestão de Caixa
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Abrir Caixa */}
        {showOpenCashModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowOpenCashModal(false)}
            />
            <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <MdAttachMoney className="w-6 h-6 text-green-600" />
                  Abrir Caixa
                </h2>
                <button
                  onClick={() => setShowOpenCashModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <MdClose className="w-6 h-6" />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Saldo Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cashOpeningBalance}
                    onChange={(e) => setCashOpeningBalance(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={cashNotes}
                    onChange={(e) => setCashNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                    placeholder="Observações sobre a abertura do caixa"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowOpenCashModal(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleOpenCash}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Abrir Caixa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6 w-full max-w-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Gestão de Pedidos
            </h1>
            <p className="text-gray-600">
              Gerencie os pedidos através do kanban
            </p>
          </div>
          <button
            onClick={async () => {
              setShowNewOrder(true);
              await loadNewOrderData();
            }}
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
            const columnOrders = (ordersByStatus[statusKey] ?? []) as Order[];

            return (
              <div
                key={status}
                className="bg-white rounded-lg shadow border border-gray-200 flex flex-col h-[calc(100vh-250px)] min-h-[600px]"
              >
                {/* Column Header */}
                <div
                  className={`p-3 border-b-2 ${config.color} rounded-t-lg h-16 flex items-center`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <h2 className="font-semibold text-base">
                        {config.label}
                      </h2>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${config.color.replace(
                        "bg-",
                        "bg-opacity-50 bg-"
                      )}`}
                    >
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
                                const createdMs = order.createdAt
                                  ? new Date(order.createdAt).getTime()
                                  : NaN;
                                const totalElapsed = isNaN(createdMs)
                                  ? NaN
                                  : now - createdMs;
                                if (statusKey === "kitchen") {
                                  return formatDuration(totalElapsed);
                                }
                                if (
                                  statusKey === "waiting_delivery" ||
                                  statusKey === "in_delivery"
                                ) {
                                  const moved = order.updatedAt
                                    ? new Date(order.updatedAt).getTime()
                                    : createdMs;
                                  const stageElapsed = isNaN(moved)
                                    ? NaN
                                    : now - moved;
                                  return (
                                    <span className="flex items-center gap-2">
                                      <span>
                                        {formatDuration(stageElapsed)}
                                      </span>
                                      <span className="text-[10px] font-normal text-gray-500">
                                        (total {formatDuration(totalElapsed)})
                                      </span>
                                    </span>
                                  );
                                }
                                if (statusKey === "completed") {
                                  const endMs = order.updatedAt
                                    ? new Date(order.updatedAt).getTime()
                                    : createdMs;
                                  const doneElapsed =
                                    isNaN(createdMs) || isNaN(endMs)
                                      ? NaN
                                      : Math.max(0, endMs - createdMs);
                                  return formatDuration(doneElapsed);
                                }
                                return `#${
                                  order.orderNumber ||
                                  String(order.id).slice(0, 8)
                                }`;
                              })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setViewOrder(order);
                                setSelectedItemsForReplication(new Set());
                              }}
                              className="text-gray-600 hover:text-gray-800"
                              title="Ver pedido"
                            >
                              <MdVisibility className="w-4 h-4" />
                            </button>
                            {(statusKey === "kitchen" ||
                              statusKey === "waiting_delivery") && (
                              <button
                                onClick={() => startEditOrder(order)}
                                className="text-gray-600 hover:text-gray-800"
                                title="Editar"
                              >
                                <MdEdit className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleCancel(order.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Cancelar"
                            >
                              <MdDelete className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Minimal info */}
                        <div className="space-y-1 mb-2">
                          {/* Badge do tipo de pedido */}
                          <div className="flex items-center gap-2 mb-1">
                            {order.deliveryAreaId ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                                <MdLocalShipping className="w-3 h-3" />
                                Entrega
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                !order.customerId ? 'bg-gray-100 text-gray-800 border-gray-300' : 'bg-purple-100 text-purple-800 border-purple-300'
                              }`}>
                                {!order.customerId ? (
                                  <>
                                    <MdStore className="w-3 h-3" />
                                    Balcão
                                  </>
                                ) : (
                                  <>
                                    <MdShoppingBag className="w-3 h-3" />
                                    Retirada
                                  </>
                                )}
                              </span>
                            )}
                          </div>
                          {order.customerName && (
                            <div className="text-sm text-gray-800">
                              <span className="font-medium">Cliente:</span>{" "}
                              {order.customerName}
                            </div>
                          )}
                          {statusKey !== "completed" && order.deliveryAreaId && (
                            <div className="text-xs text-gray-600">
                              {getOrderAddressLabel(order)}
                            </div>
                          )}
                          {/* Forma de pagamento para retirada/balcão em waiting_delivery */}
                          {statusKey === "waiting_delivery" && !order.deliveryAreaId && (
                            <div className="text-xs text-gray-700 mb-2">
                              <div className="mb-1">Forma de pagamento</div>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={
                                    paymentQueryByOrder[String(order.id)] ??
                                    (() => {
                                      const pm = paymentMethods.find(
                                        (p) =>
                                          String(p.id) ===
                                          String(order.paymentMethodId)
                                      );
                                      if (!pm) return "";
                                      const kind = order.paymentMethodKind;
                                      if (kind === "credit")
                                        return `${pm.name} - Crédito`;
                                      if (kind === "debit")
                                        return `${pm.name} - Débito`;
                                      if (kind === "pix")
                                        return `${pm.name} - Pix`;
                                      if (kind === "cash") return "Dinheiro";
                                      return pm.name;
                                    })()
                                  }
                                  onChange={(e) =>
                                    setPaymentQueryByOrder((prev) => ({
                                      ...prev,
                                      [String(order.id)]: e.target.value,
                                    }))
                                  }
                                  onFocus={() =>
                                    setPaymentDropdownOpen((prev) => ({
                                      ...prev,
                                      [String(order.id)]: true,
                                    }))
                                  }
                                  onBlur={() =>
                                    setTimeout(
                                      () =>
                                        setPaymentDropdownOpen((prev) => ({
                                          ...prev,
                                          [String(order.id)]: false,
                                        })),
                                      150
                                    )
                                  }
                                  placeholder="Selecione ou pesquise..."
                                  className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {paymentDropdownOpen[String(order.id)] && (
                                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto">
                                    {buildPaymentOptions
                                      .filter((opt) => {
                                        const q = (
                                          paymentQueryByOrder[
                                            String(order.id)
                                          ] || ""
                                        ).toLowerCase();
                                        return opt.label
                                          .toLowerCase()
                                          .includes(q);
                                      })
                                      .map((opt) => (
                                        <button
                                          key={`${opt.id}-${opt.kind}`}
                                          type="button"
                                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                          onMouseDown={async () => {
                                            const updateData: any = {
                                              paymentMethodId: String(opt.id),
                                              paymentMethodKind: opt.kind as any,
                                            };
                                            
                                            // Se for dinheiro e houver valor de troco preenchido, incluir
                                            if (opt.kind === "cash") {
                                              const changeValue = cashChangeByOrder[String(order.id)] || "";
                                              if (changeValue.trim()) {
                                                const changeFor = Number(changeValue);
                                                updateData.changeFor = changeFor;
                                                updateData.changeAmount = Math.max(
                                                  0,
                                                  changeFor - order.total
                                                );
                                              } else {
                                                // Se não houver valor, limpar
                                                updateData.changeFor = undefined;
                                                updateData.changeAmount = undefined;
                                              }
                                            } else {
                                              // Se não for dinheiro, limpar troco
                                              updateData.changeFor = undefined;
                                              updateData.changeAmount = undefined;
                                            }
                                            
                                            await orderService.update(order.id, updateData);
                                            setPaymentQueryByOrder((prev) => ({
                                              ...prev,
                                              [String(order.id)]: opt.label,
                                            }));
                                            setPaymentDropdownOpen((prev) => ({
                                              ...prev,
                                              [String(order.id)]: false,
                                            }));
                                            
                                            // Se não for dinheiro, limpar o campo de troco
                                            if (opt.kind !== "cash") {
                                              setCashChangeByOrder((prev) => {
                                                const next = { ...prev };
                                                delete next[String(order.id)];
                                                return next;
                                              });
                                            }
                                            
                                            await loadData();
                                          }}
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                    {buildPaymentOptions.filter((opt) => {
                                      const q = (
                                        paymentQueryByOrder[String(order.id)] ||
                                        ""
                                      ).toLowerCase();
                                      return opt.label
                                        .toLowerCase()
                                        .includes(q);
                                    }).length === 0 && (
                                      <div className="px-3 py-2 text-xs text-gray-500">
                                        Nenhuma forma cadastrada
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {/* Campo de troco para dinheiro */}
                              {(() => {
                                const pm = paymentMethods.find(
                                  (p) => String(p.id) === String(order.paymentMethodId)
                                );
                                const paymentQuery = paymentQueryByOrder[String(order.id)] || "";
                                const isCash = order.paymentMethodKind === "cash" || paymentQuery.toLowerCase().includes("dinheiro");
                                const requiresChange = pm?.requiresChange || isCash;
                                
                                if (!requiresChange) return null;
                                
                                return (
                                  <div className="mt-2">
                                    <div className="mb-1 text-xs text-gray-600">
                                      Troco para quanto? (opcional)
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={cashChangeByOrder[String(order.id)] ?? (order.changeFor ? String(order.changeFor) : "")}
                                      onChange={(e) => {
                                        setCashChangeByOrder((prev) => ({
                                          ...prev,
                                          [String(order.id)]: e.target.value,
                                        }));
                                      }}
                                      onBlur={async () => {
                                        const changeValue = cashChangeByOrder[String(order.id)] || "";
                                        if (changeValue.trim() || order.changeFor) {
                                          const updateData: any = {};
                                          if (changeValue.trim()) {
                                            const changeFor = Number(changeValue);
                                            updateData.changeFor = changeFor;
                                            updateData.changeAmount = Math.max(
                                              0,
                                              changeFor - order.total
                                            );
                                          } else {
                                            updateData.changeFor = undefined;
                                            updateData.changeAmount = undefined;
                                          }
                                          await orderService.update(order.id, updateData);
                                          await loadData();
                                        }
                                      }}
                                      placeholder="Ex.: 100,00"
                                      className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {statusKey === "in_delivery" && (
                            <div className="text-xs text-gray-700">
                              <div className="mb-1">Entregador</div>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={
                                    driverQueryByOrder[String(order.id)] ??
                                    (drivers.find(
                                      (d) =>
                                        String(d.id) ===
                                        String(order.deliveryDriverId)
                                    )?.name ||
                                      "")
                                  }
                                  onChange={(e) =>
                                    setDriverQueryByOrder((prev) => ({
                                      ...prev,
                                      [String(order.id)]: e.target.value,
                                    }))
                                  }
                                  onFocus={() =>
                                    setDriverDropdownOpen((prev) => ({
                                      ...prev,
                                      [String(order.id)]: true,
                                    }))
                                  }
                                  onBlur={() =>
                                    setTimeout(
                                      () =>
                                        setDriverDropdownOpen((prev) => ({
                                          ...prev,
                                          [String(order.id)]: false,
                                        })),
                                      150
                                    )
                                  }
                                  placeholder="Selecione ou pesquise..."
                                  className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                />
                                {driverDropdownOpen[String(order.id)] && (
                                  <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-40 overflow-auto">
                                    {drivers
                                      .filter((d) => {
                                        const q = (
                                          driverQueryByOrder[
                                            String(order.id)
                                          ] || ""
                                        ).toLowerCase();
                                        return d.name.toLowerCase().includes(q);
                                      })
                                      .map((d) => (
                                        <button
                                          key={d.id}
                                          type="button"
                                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                          onMouseDown={async () => {
                                            await orderService.update(
                                              order.id,
                                              { deliveryDriverId: String(d.id) }
                                            );
                                            setDriverQueryByOrder((prev) => ({
                                              ...prev,
                                              [String(order.id)]: d.name,
                                            }));
                                            setDriverDropdownOpen((prev) => ({
                                              ...prev,
                                              [String(order.id)]: false,
                                            }));
                                            await loadData();
                                          }}
                                        >
                                          {d.name}
                                        </button>
                                      ))}
                                    {drivers.filter((d) => {
                                      const q = (
                                        driverQueryByOrder[String(order.id)] ||
                                        ""
                                      ).toLowerCase();
                                      return d.name.toLowerCase().includes(q);
                                    }).length === 0 && (
                                      <div className="px-3 py-2 text-xs text-gray-500">
                                        Nenhum entregador
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2">
                                <div className="mb-1">Forma de pagamento</div>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={
                                      paymentQueryByOrder[String(order.id)] ??
                                      (() => {
                                        const pm = paymentMethods.find(
                                          (p) =>
                                            String(p.id) ===
                                            String(order.paymentMethodId)
                                        );
                                        if (!pm) return "";
                                        const kind = order.paymentMethodKind;
                                        if (kind === "credit")
                                          return `${pm.name} - Crédito`;
                                        if (kind === "debit")
                                          return `${pm.name} - Débito`;
                                        if (kind === "pix")
                                          return `${pm.name} - Pix`;
                                        if (kind === "cash") return "Dinheiro";
                                        return pm.name;
                                      })()
                                    }
                                    onChange={(e) =>
                                      setPaymentQueryByOrder((prev) => ({
                                        ...prev,
                                        [String(order.id)]: e.target.value,
                                      }))
                                    }
                                    onFocus={() =>
                                      setPaymentDropdownOpen((prev) => ({
                                        ...prev,
                                        [String(order.id)]: true,
                                      }))
                                    }
                                    onBlur={() =>
                                      setTimeout(
                                        () =>
                                          setPaymentDropdownOpen((prev) => ({
                                            ...prev,
                                            [String(order.id)]: false,
                                          })),
                                        150
                                      )
                                    }
                                    placeholder="Selecione ou pesquise..."
                                    className="w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  {paymentDropdownOpen[String(order.id)] && (
                                    <div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-auto">
                                      {buildPaymentOptions
                                        .filter((opt) => {
                                          const q = (
                                            paymentQueryByOrder[
                                              String(order.id)
                                            ] || ""
                                          ).toLowerCase();
                                          return opt.label
                                            .toLowerCase()
                                            .includes(q);
                                        })
                                        .map((opt) => (
                                          <button
                                            key={`${opt.id}-${opt.kind}`}
                                            type="button"
                                            className="w-full text-left px-3 py-2 hover:bg-gray-50"
                                            onMouseDown={async () => {
                                              await orderService.update(
                                                order.id,
                                                {
                                                  paymentMethodId: String(
                                                    opt.id
                                                  ),
                                                  paymentMethodKind:
                                                    opt.kind as any,
                                                }
                                              );
                                              setPaymentQueryByOrder(
                                                (prev) => ({
                                                  ...prev,
                                                  [String(order.id)]: opt.label,
                                                })
                                              );
                                              setPaymentDropdownOpen(
                                                (prev) => ({
                                                  ...prev,
                                                  [String(order.id)]: false,
                                                })
                                              );
                                              await loadData();
                                            }}
                                          >
                                            {opt.label}
                                          </button>
                                        ))}
                                      {buildPaymentOptions.filter((opt) => {
                                        const q = (
                                          paymentQueryByOrder[
                                            String(order.id)
                                          ] || ""
                                        ).toLowerCase();
                                        return opt.label
                                          .toLowerCase()
                                          .includes(q);
                                      }).length === 0 && (
                                        <div className="px-3 py-2 text-xs text-gray-500">
                                          Nenhuma forma cadastrada
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* Campo de troco para dinheiro */}
                              {(() => {
                                const pm = paymentMethods.find(
                                  (p) => String(p.id) === String(order.paymentMethodId)
                                );
                                const paymentQuery = paymentQueryByOrder[String(order.id)] || "";
                                const isCash = order.paymentMethodKind === "cash" || paymentQuery.toLowerCase().includes("dinheiro");
                                const requiresChange = pm?.requiresChange || isCash;
                                
                                if (!requiresChange) return null;
                                
                                return (
                                  <div className="mt-2">
                                    <div className="mb-1 text-xs text-gray-600">
                                      Troco para quanto? (opcional)
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={cashChangeByOrder[String(order.id)] ?? (order.changeFor ? String(order.changeFor) : "")}
                                      onChange={(e) => {
                                        setCashChangeByOrder((prev) => ({
                                          ...prev,
                                          [String(order.id)]: e.target.value,
                                        }));
                                      }}
                                      onBlur={async () => {
                                        const changeValue = cashChangeByOrder[String(order.id)] || "";
                                        if (changeValue.trim() || order.changeFor) {
                                          const updateData: any = {};
                                          if (changeValue.trim()) {
                                            const changeFor = Number(changeValue);
                                            updateData.changeFor = changeFor;
                                            updateData.changeAmount = Math.max(
                                              0,
                                              changeFor - order.total
                                            );
                                          } else {
                                            updateData.changeFor = undefined;
                                            updateData.changeAmount = undefined;
                                          }
                                          await orderService.update(order.id, updateData);
                                          await loadData();
                                        }
                                      }}
                                      placeholder="Ex.: 100,00"
                                      className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                          {statusKey !== "kitchen" && statusKey !== "completed" && (
                              <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                                {(() => {
                                  // Mostrar "Receber R$ X"; não exibir forma de pagamento nem "Enviar ..."
                                  const changeFor =
                                    typeof order.changeFor === "number" && order.changeFor > 0
                                      ? order.changeFor
                                      : undefined;
                                  const isCash = order.paymentMethodKind === "cash";
                                  // Para dinheiro, sempre usar o valor do troco preenchido (changeFor) se existir
                                  // Se não houver changeFor preenchido, usar o total do pedido
                                  const toReceive = isCash && changeFor ? changeFor : order.total;
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
                          {statusKey !== "kitchen" && (
                            <button
                              onClick={() => {
                                const isDelivery = !!order.deliveryAreaId;
                                const prevStatus: OrderStatus[] = isDelivery
                                  ? [
                                      "kitchen",
                                      "waiting_delivery",
                                      "in_delivery",
                                      "completed",
                                    ]
                                  : [
                                      "kitchen",
                                      "waiting_delivery",
                                      "completed",
                                    ];
                                const currentIndex =
                                  prevStatus.indexOf(statusKey);
                                if (currentIndex > 0) {
                                  handleStatusChange(
                                    order.id,
                                    prevStatus[currentIndex - 1]
                                  );
                                }
                              }}
                              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                            >
                              <MdArrowBack className="w-4 h-4" />
                              Anterior
                            </button>
                          )}
                          {statusKey !== "completed" && (
                            <button
                              onClick={() => {
                                const isDelivery = !!order.deliveryAreaId;
                                const nextStatus: OrderStatus[] = isDelivery
                                  ? [
                                      "kitchen",
                                      "waiting_delivery",
                                      "in_delivery",
                                      "completed",
                                    ]
                                  : [
                                      "kitchen",
                                      "waiting_delivery",
                                      "completed",
                                    ];
                                const currentIndex =
                                  nextStatus.indexOf(statusKey);
                                if (currentIndex < nextStatus.length - 1) {
                                  const target = nextStatus[currentIndex + 1];
                                  // Block going to completed without delivery driver (only for delivery orders)
                                  if (
                                    target === "completed" &&
                                    isDelivery &&
                                    !order.deliveryDriverId
                                  ) {
                                    alert(
                                      "Selecione um entregador antes de concluir."
                                    );
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
            <div
              className="absolute inset-0 bg-black bg-opacity-40"
              onClick={() => setShowNewOrder(false)}
            />
            <div className="relative bg-white w-screen h-screen rounded-none shadow-xl flex flex-col overflow-hidden">
              {/* Header */}
              <div className="relative z-50 bg-white flex items-center justify-between p-4 border-b shrink-0">
                <div className="flex items-center gap-2 text-gray-800">
                  <MdShoppingCart className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Novo Pedido Rápido</h3>
                </div>
                <button
                  onClick={() => setShowNewOrder(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <MdClose className="w-6 h-6" />
                </button>
              </div>

              {/* Tabs para tipo de pedido */}
              <div className="border-b bg-gray-50 px-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('counter');
                      setSelectedAreaId(undefined);
                      setSelectedAddressIndex(undefined);
                      setSelectedCustomerAddresses([]);
                      setCustomerNameInput('');
                      setCustomerPhoneInput('');
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 ${
                      orderType === 'counter'
                        ? 'bg-white border-t border-l border-r border-gray-300 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <MdStore className="w-4 h-4" />
                    Balcão
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('pickup');
                      setSelectedAreaId(undefined);
                      setSelectedAddressIndex(undefined);
                      setSelectedCustomerAddresses([]);
                      setCustomerNameInput('');
                      setCustomerPhoneInput('');
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 ${
                      orderType === 'pickup'
                        ? 'bg-white border-t border-l border-r border-gray-300 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <MdShoppingBag className="w-4 h-4" />
                    Retirada
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('delivery');
                      setCustomerNameInput('');
                      setCustomerPhoneInput('');
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 ${
                      orderType === 'delivery'
                        ? 'bg-white border-t border-l border-r border-gray-300 text-blue-600'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <MdLocalShipping className="w-4 h-4" />
                    Entrega
                  </button>
                </div>
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-gray-800 font-medium">
                          <MdPerson className="w-4 h-4" /> Cliente
                        </div>
                        {selectedCustomerId && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const customer = customers.find(c => String(c.id) === String(selectedCustomerId));
                              if (customer) {
                                handleViewCustomerHistory(selectedCustomerId, customer.name, e);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded hover:bg-gray-100"
                            title="Ver histórico do cliente"
                          >
                            <MdHistory className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={selectedCustomerId ? (selectedCustomerName || customerQuery) : customerQuery}
                          onChange={(e) => {
                            if (!selectedCustomerId) {
                              const value = e.target.value;
                              handleCustomerInputChange(value);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (selectedCustomerId) {
                              // Bloquear todas as teclas quando há cliente selecionado
                              e.preventDefault();
                              return;
                            }
                          }}
                          readOnly={!!selectedCustomerId}
                          placeholder={orderType === 'delivery' ? "Nome do cliente *" : "Nome do cliente"}
                          className={`w-full pl-10 ${selectedCustomerId || customerQuery.trim() ? 'pr-10' : 'pr-3'} py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${selectedCustomerId ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        />
                        <MdSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        {(selectedCustomerId || customerQuery.trim()) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleClearCustomer();
                            }}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Limpar cliente"
                          >
                            <MdClose className="w-5 h-5" />
                          </button>
                        )}
                        {/* Sugestões somente quando digitando */}
                        {customerQuery.trim() && filteredCustomers.length > 0 && (
                          <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-auto">
                            {filteredCustomers.map((c) => (
                              <div
                                key={c.id}
                                className={`w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 ${
                                  selectedCustomerId === c.id ? "bg-blue-50" : ""
                                }`}
                              >
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectCustomer(c);
                                  }}
                                  className="flex-1 text-left"
                                >
                                  <div className="font-medium text-gray-900 text-sm">
                                    {c.name}
                                  </div>
                                  {c.phone && (
                                    <div className="text-xs text-gray-500">
                                      {c.phone}
                                    </div>
                                  )}
                                </button>
                                <button
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleViewCustomerHistory(c.id, c.name, e);
                                  }}
                                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Ver histórico"
                                >
                                  <MdHistory className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Campo de telefone para entrega quando não há cliente selecionado */}
                      {orderType === 'delivery' && !selectedCustomerId && customerNameInput.trim() && (
                        <div className="mt-2 relative z-40">
                          <input
                            type="text"
                            value={customerPhoneInput}
                            onChange={(e) => setCustomerPhoneInput(e.target.value)}
                            placeholder="Telefone * (obrigatório para entrega)"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none ${
                              !customerPhoneInput.trim() ? 'border-red-300' : 'border-gray-300'
                            }`}
                          />
                        </div>
                      )}

                      {/* Mensagem informativa para auto-cadastro */}
                      {customerQuery.trim() &&
                        filteredCustomers.length === 0 &&
                        !selectedCustomerId && (
                          <div className="mt-2 text-xs text-gray-500">
                            Cliente será cadastrado automaticamente ao criar o pedido
                            {orderType === 'delivery' && ' (telefone obrigatório)'}
                          </div>
                        )}

                      {/* Endereços do cliente selecionado - apenas para entrega */}
                      {selectedCustomerId && orderType === 'delivery' && (
                        <div className="mt-3">
                          <div className="text-xs text-gray-500 mb-2">
                            Endereço de entrega
                          </div>
                          {selectedCustomerAddresses &&
                          selectedCustomerAddresses.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {selectedCustomerAddresses.map((addr, idx) => {
                                const areaName =
                                  areas.find(
                                    (a) =>
                                      String(a.id) ===
                                      String(addr.deliveryAreaId)
                                  )?.name || "Área";
                                const label = `${addr.address || ""} ${
                                  addr.address ? " - " : ""
                                }${areaName}`.trim();
                                const active = selectedAddressIndex === idx;
                                return (
                                  <button
                                    key={`${addr.deliveryAreaId}-${idx}`}
                                    onClick={() => {
                                      setSelectedAddressIndex(idx);
                                      setSelectedAreaId(addr.deliveryAreaId);
                                    }}
                                    className={`px-3 py-1.5 rounded-full border text-sm ${
                                      active
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                                    }`}
                                    title={label}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                              <button
                                className={`px-3 py-1.5 rounded-full border text-sm ${
                                  isAddingAddress
                                    ? "bg-green-600 text-white border-green-600"
                                    : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                                }`}
                                onClick={() => setIsAddingAddress((v) => !v)}
                              >
                                {isAddingAddress
                                  ? "Cancelar"
                                  : "Adicionar endereço"}
                              </button>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500">
                              Nenhum endereço cadastrado.{" "}
                              <button
                                className="text-blue-600 font-medium"
                                onClick={() => setIsAddingAddress(true)}
                              >
                                Adicionar endereço
                              </button>
                            </div>
                          )}

                          {isAddingAddress && (
                            <div className="mt-3 flex flex-col gap-2">
                              <input
                                type="text"
                                value={newAddressText}
                                onChange={(e) =>
                                  setNewAddressText(e.target.value)
                                }
                                placeholder="Endereço (rua, número, complemento)"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              />
                              <div>
                                <select
                                  value={newAddressAreaId}
                                  onChange={(e) =>
                                    setNewAddressAreaId(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                >
                                  <option value="">
                                    Selecione a área de entrega
                                  </option>
                                  {areas.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.name} (Taxa:{" "}
                                      {formatCurrency(a.deliveryFee)})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button
                                  className="px-3 py-2 bg-gray-200 rounded-lg text-gray-700"
                                  onClick={() => setIsAddingAddress(false)}
                                >
                                  Cancelar
                                </button>
                                <button
                                  className="px-3 py-2 bg-green-600 rounded-lg text-white"
                                  onClick={saveNewAddress}
                                >
                                  Salvar endereço
                                </button>
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
                            className={`px-3 py-1.5 rounded-full border text-sm ${
                              activeCategory === c.name
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white hover:bg-gray-50 border-gray-300 text-gray-700"
                            }`}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-1 items-stretch">
                          {visibleProducts.map((p) => (
                            <div
                              key={p.id}
                              className="border rounded-lg p-3 bg-white hover:shadow transition flex flex-col h-full"
                            >
                              <div className="flex items-start justify-between gap-2 flex-1 min-h-0">
                                <button
                                  onClick={() => addToCart(p)}
                                  className="text-left flex-1 min-w-0"
                                  title="Adicionar ao pedido"
                                >
                                  <div className="text-sm font-medium text-gray-800 break-words whitespace-normal">
                                    {p.code} - {p.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {formatCurrency(p.sellingPrice)}
                                  </div>
                                </button>
                                <button
                                  onClick={() => {
                                    setNoteModalProduct(p);
                                    setNoteText("");
                                  }}
                                  className="text-gray-500 hover:text-gray-700 p-1 flex-shrink-0 self-start"
                                  title="Adicionar com observação"
                                >
                                  <MdNotes className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {visibleProducts.length === 0 && (
                            <div className="col-span-full text-center text-sm text-gray-500 py-8">
                              Nenhum produto
                            </div>
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
                    <div className="text-sm text-gray-500">
                      Nenhum item adicionado
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                      {cartItems.map((ci) => (
                        <div
                          key={ci.key}
                          className="flex items-center justify-between gap-2 border rounded-lg p-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-800 truncate">
                              {ci.productName}
                            </div>
                            {ci.notes && (
                              <div className="text-xs text-gray-500 truncate">
                                Obs: {ci.notes}
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              {formatCurrency(ci.unitPrice)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => decItem(ci.key)}
                              className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200"
                            >
                              <MdRemove className="w-4 h-4" />
                            </button>
                            <div className="w-8 text-center text-sm font-medium">
                              {ci.quantity}
                            </div>
                            <button
                              onClick={() => incItem(ci.key)}
                              className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <MdAdd className="w-4 h-4" />
                            </button>
                            <div className="w-20 text-right text-sm font-semibold">
                              {formatCurrency(ci.quantity * ci.unitPrice)}
                            </div>
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
                      {orderType === 'delivery' && deliveryFee > 0 && (
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Entrega</span>
                          <span>{formatCurrency(deliveryFee)}</span>
                        </div>
                      )}
                    </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    <button
                      onClick={() => setShowCartDetails((v) => !v)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        setShowCartDetails(false);
                        // Limpar estados do modal de pagamento antes de abrir
                        setSelectedPaymentMethodId("");
                        setSelectedPaymentKind("");
                        setCashChangeAmount("");
                        setPaymentSearch("");
                        setPaymentOptionsOpen(false);
                        setShowPaymentModal(true);
                      }}
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
                onClick={() => setShowCartDetails((v) => !v)}
                title={showCartDetails ? "Recolher" : "Ver detalhes"}
              >
                <div className="hidden md:block text-sm font-medium text-gray-700 min-w-[120px]">
                  {showCartDetails ? "Recolher" : "Resumo"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-900 truncate flex items-center gap-2">
                    <span>
                      Cliente:{" "}
                      <span className="font-medium">
                        {selectedCustomerName || customerNameInput.trim() || "—"}
                      </span>
                      {selectedCustomerPhone ? ` (${selectedCustomerPhone})` : (customerPhoneInput.trim() ? ` (${customerPhoneInput.trim()})` : "")}
                    </span>
                    {selectedCustomerId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const customer = customers.find(c => String(c.id) === String(selectedCustomerId));
                          if (customer) {
                            handleViewCustomerHistory(selectedCustomerId, customer.name, e);
                          }
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                        title="Ver histórico do cliente"
                      >
                        <MdHistory className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {orderType === 'delivery' && (
                    <div className="text-xs text-gray-600">
                      <span className="truncate inline-block max-w-full align-bottom">
                        Endereço: {selectedAddress?.address || "—"}
                        {selectedArea ? ` - ${selectedArea.name}` : ""}
                      </span>
                      {selectedArea && (
                        <span className="ml-2 whitespace-nowrap">
                          (Taxa {formatCurrency(selectedArea.deliveryFee)})
                        </span>
                      )}
                    </div>
                  )}
                  {orderType !== 'delivery' && (
                    <div className="text-xs text-gray-500">
                      {orderType === 'counter' ? 'Balcão' : 'Retirada'}
                    </div>
                  )}
                </div>
                <div className="text-base font-bold text-gray-900 whitespace-nowrap">
                  {formatCurrency(total)}
                </div>
              </div>

              {/* Modal de Observação do Produto */}
              {noteModalProduct && (
                <div className="absolute inset-0 z-50 flex items-center justify-center">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => {
                      setNoteModalProduct(null);
                      setNoteText("");
                    }}
                  />
                  <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl border">
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="text-gray-800 font-semibold text-base">
                        Adicionar observação
                      </div>
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          setNoteModalProduct(null);
                          setNoteText("");
                        }}
                      >
                        <MdClose className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="text-sm text-gray-700 mb-2 truncate">
                        {noteModalProduct.code} - {noteModalProduct.name}
                      </div>
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
                        onClick={() => {
                          setNoteModalProduct(null);
                          setNoteText("");
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        onClick={() => {
                          if (!noteModalProduct) return;
                          const text = noteText.trim();
                          if (text) addToCart(noteModalProduct, text);
                          setNoteText("");
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
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => {
                      setShowPaymentModal(false);
                      // Limpar estados ao fechar
                      setSelectedPaymentMethodId("");
                      setSelectedPaymentKind("");
                      setCashChangeAmount("");
                      setPaymentSearch("");
                      setPaymentOptionsOpen(false);
                    }}
                  />
                  <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl border">
                    <div className="flex items-center justify-between p-4 border-b">
                      <div className="text-gray-800 font-semibold text-base">
                        Finalizar pagamento
                      </div>
                      <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => {
                          setShowPaymentModal(false);
                          // Limpar estados ao fechar
                          setSelectedPaymentMethodId("");
                          setSelectedPaymentKind("");
                          setCashChangeAmount("");
                          setPaymentSearch("");
                          setPaymentOptionsOpen(false);
                        }}
                      >
                        <MdClose className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="text-sm text-gray-700 mb-2">
                        Selecione a forma de pagamento
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={paymentSearch}
                          onChange={(e) => {
                            setPaymentSearch(e.target.value);
                            setPaymentOptionsOpen(true);
                          }}
                          onFocus={() => setPaymentOptionsOpen(true)}
                          onBlur={() =>
                            setTimeout(() => setPaymentOptionsOpen(false), 150)
                          }
                          placeholder="Buscar forma de pagamento..."
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        {paymentOptionsOpen && (
                          <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow max-h-56 overflow-auto">
                            {buildPaymentOptions
                              .filter((opt) =>
                                opt.label
                                  .toLowerCase()
                                  .includes(paymentSearch.toLowerCase())
                              )
                              .map((opt) => (
                                <button
                                  type="button"
                                  key={`${opt.id}-${opt.kind}`}
                                  onClick={() => {
                                    setSelectedPaymentMethodId(opt.id);
                                    setSelectedPaymentKind(opt.kind);
                                    setPaymentSearch(opt.label);
                                    setPaymentOptionsOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                                    selectedPaymentMethodId === opt.id &&
                                    selectedPaymentKind === opt.kind
                                      ? "bg-blue-50"
                                      : ""
                                  }`}
                                >
                                  <div className="text-sm text-gray-800">
                                    {opt.label}
                                  </div>
                                </button>
                              ))}
                            {buildPaymentOptions.length === 0 && (
                              <div className="text-xs text-gray-500 px-3 py-2">
                                Nenhuma forma de pagamento cadastrada
                              </div>
                            )}
                          </div>
                        )}
                        {!paymentOptionsOpen &&
                          buildPaymentOptions.length === 0 && (
                            <div className="text-xs text-gray-500 px-3 py-2">
                              Nenhuma forma de pagamento cadastrada
                            </div>
                          )}
                      </div>
                      {selectedPaymentMethodId &&
                        (paymentMethods.find(
                          (pm) => pm.id === selectedPaymentMethodId
                        )?.requiresChange ||
                          selectedPaymentKind === "cash") && (
                          <div className="mt-3">
                            <label className="block text-xs text-gray-600 mb-1">
                              Troco para quanto? (opcional)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={cashChangeAmount}
                              onChange={(e) =>
                                setCashChangeAmount(e.target.value)
                              }
                              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                              placeholder="Ex.: 100,00"
                            />
                            {editOrderId && cashChangeAmount && (
                              <div className="mt-2 text-sm text-gray-700">
                                {(() => {
                                  const given =
                                    parseFloat(cashChangeAmount || "0") || 0;
                                  const change = Math.max(0, given - total);
                                  return (
                                    <div>
                                      Enviar de troco:{" "}
                                      <span className="font-semibold">
                                        {formatCurrency(change)}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                    <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
                      <button
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        onClick={() => {
                          setShowPaymentModal(false);
                          // Limpar estados ao fechar
                          setSelectedPaymentMethodId("");
                          setSelectedPaymentKind("");
                          setCashChangeAmount("");
                          setPaymentSearch("");
                          setPaymentOptionsOpen(false);
                        }}
                      >
                        Voltar
                      </button>
                      <button
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        disabled={!selectedPaymentMethodId}
                        onClick={async () => {
                          // Salvar valores antes de limpar
                          const paymentMethodId = selectedPaymentMethodId;
                          const paymentKind = selectedPaymentKind;
                          const changeAmount = cashChangeAmount;
                          
                          // Limpar estados do modal antes de fechar
                          setShowPaymentModal(false);
                          setSelectedPaymentMethodId("");
                          setSelectedPaymentKind("");
                          setCashChangeAmount("");
                          setPaymentSearch("");
                          setPaymentOptionsOpen(false);
                          
                          if (editOrderId) {
                            // Atualiza pedido existente
                            const pm = paymentMethods.find(
                              (p) => p.id === paymentMethodId
                            );
                            const requires = pm?.requiresChange || paymentKind === "cash";
                            const updateData: any = {
                              customerId: selectedCustomerId,
                              deliveryAreaId: selectedAreaId,
                              paymentMethodId: paymentMethodId,
                              paymentMethodKind: (paymentKind ||
                                "other") as any,
                              items: cartItems.map((ci) => ({
                                productId: ci.productId,
                                productName: ci.productName,
                                quantity: ci.quantity,
                                unitPrice: ci.unitPrice,
                                notes: ci.notes,
                              })) as any,
                              notes: notes || undefined,
                            };
                            
                            // Se requer troco e há valor preenchido, atualizar
                            if (requires && changeAmount.trim()) {
                              updateData.changeFor = Number(changeAmount);
                              updateData.changeAmount = Math.max(
                                0,
                                (parseFloat(changeAmount || "0") || 0) - total
                              );
                            } else if (requires) {
                              // Se requer troco mas não há valor, limpar
                              updateData.changeFor = undefined;
                              updateData.changeAmount = undefined;
                            }
                            
                            await orderService.update(editOrderId, updateData);
                            setShowNewOrder(false);
                            setEditOrderId(null);
                            await loadData();
                          } else {
                            // Create new order with change info when applicable
                            const pm = paymentMethods.find(
                              (p) => p.id === paymentMethodId
                            );
                            const requires = pm?.requiresChange || paymentKind === "cash";
                            const changeFor =
                              requires && changeAmount.trim()
                                ? Number(changeAmount)
                                : undefined;
                            const calculatedChangeAmount =
                              requires && changeFor
                                ? Math.max(0, changeFor - total)
                                : undefined;
                            await handleCreateOrderWithPayment(
                              paymentMethodId,
                              notes || "",
                              changeFor,
                              calculatedChangeAmount
                            );
                          }
                        }}
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de edição dedicado removido; edição usa a tela de pedido rápido reaberta */}
            </div>
          </div>
        )}

        {/* Modal de Visualização do Pedido - fora do contexto showNewOrder */}
        {viewOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                setViewOrder(null);
                setSelectedItemsForReplication(new Set());
              }}
            />
            <div className="relative bg-white w-full max-w-lg mx-4 rounded-lg shadow-xl border max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <div className="text-gray-800 font-semibold text-base">
                  Pedido #
                  {viewOrder.orderNumber || String(viewOrder.id).slice(0, 8)}
                </div>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setViewOrder(null);
                    setSelectedItemsForReplication(new Set());
                  }}
                >
                  <MdClose className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-auto flex flex-col gap-3">
                <div className="text-sm text-gray-800">
                  <span className="font-medium">Cliente:</span>{" "}
                  {viewOrder.customerName || "—"}
                </div>
                <div className="text-sm text-gray-700">
                  {viewOrder.deliveryAreaName || "—"}
                </div>
                <div className="text-sm text-gray-700">
                  {viewOrder.paymentMethodName || "—"}
                </div>
                <div className="border-t pt-3">
                  <div className="text-xs font-medium text-gray-600 mb-2 flex items-center justify-between">
                    <span>Itens</span>
                    <button
                      onClick={() => handleReplicateFullOrder(viewOrder)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                    >
                      Replicar pedido completo
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 max-h-60 overflow-auto">
                    {(viewOrder.items || []).map((it, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-700 border-b pb-2">
                        <input
                          type="checkbox"
                          checked={selectedItemsForReplication.has(idx)}
                          onChange={() => toggleItemSelection(idx)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div>
                            {it.quantity}x {it.productName} —{" "}
                            {formatCurrency(it.unitPrice * it.quantity)}
                          </div>
                          {it.notes && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              Obs: {it.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-sm flex justify-between text-gray-800">
                    <span>Total</span>
                    <span className="font-bold">
                      {formatCurrency(viewOrder.total)}
                    </span>
                  </div>
                </div>
                {viewOrder.notes && (
                  <div className="text-xs text-gray-700">
                    <span className="font-medium text-gray-600">Observação do pedido:</span>
                    <div className="text-gray-600 p-2 bg-gray-50 rounded mt-1">
                      {viewOrder.notes}
                    </div>
                  </div>
                )}
                {selectedItemsForReplication.size > 0 && (
                  <div className="border-t pt-3 flex justify-end">
                    <button
                      onClick={() => handleReplicateSelectedItems(viewOrder)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Replicar {selectedItemsForReplication.size} item(ns) selecionado(s)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Histórico do Cliente */}
        {customerHistoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setCustomerHistoryModal(null)}
            />
            <div className="relative bg-white w-full max-w-2xl mx-4 rounded-lg shadow-xl border max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <div className="text-gray-800 font-semibold text-base">
                  Histórico de Pedidos - {customerHistoryModal.customerName}
                </div>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setCustomerHistoryModal(null)}
                >
                  <MdClose className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-auto">
                {loadingCustomerHistory ? (
                  <div className="text-center text-gray-500 py-8">
                    Carregando...
                  </div>
                ) : customerHistoryOrders.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    Nenhum pedido concluído encontrado para este cliente.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {customerHistoryOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">
                              Pedido #{order.orderNumber || String(order.id).slice(0, 8)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "—"}
                            </div>
                          </div>
                          <div className="text-base font-bold text-gray-900">
                            {formatCurrency(order.total)}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          <div className="mb-2">
                            <span className="font-medium">{order.items?.length || 0} item(ns):</span>
                          </div>
                          <div className="flex flex-col gap-1 max-h-32 overflow-auto pl-2 border-l-2 border-gray-200">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-700">
                                <span className="font-medium">{item.quantity}x {item.productName}</span>
                                {item.notes && (
                                  <span className="text-gray-500 italic ml-1">
                                    (Obs: {item.notes})
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setCustomerHistoryModal(null);
                              setViewOrder(order);
                              setSelectedItemsForReplication(new Set());
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Ver detalhes
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
