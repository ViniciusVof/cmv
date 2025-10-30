import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import type { Order, OrderStatus } from '../types/order';
import { orderService } from '../services/orderService';
import { 
  MdAdd, 
  MdEdit, 
  MdDelete, 
  MdArrowForward, 
  MdArrowBack, 
  MdRestaurant,
  MdLocalShipping,
  MdCheckCircle,
  MdSchedule
} from 'react-icons/md';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: typeof MdRestaurant }> = {
  kitchen: { label: 'Cozinha', color: 'bg-orange-100 border-orange-300 text-orange-800', icon: MdRestaurant },
  waiting_delivery: { label: 'Aguardando Entrega', color: 'bg-yellow-100 border-yellow-300 text-yellow-800', icon: MdSchedule },
  in_delivery: { label: 'Em Entrega', color: 'bg-blue-100 border-blue-300 text-blue-800', icon: MdLocalShipping },
  completed: { label: 'Concluído', color: 'bg-green-100 border-green-300 text-green-800', icon: MdCheckCircle },
};

export function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await orderService.getAll();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      alert('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
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
      grouped[order.status].push(order);
    });
    return grouped;
  }, [orders]);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
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
      <div className="space-y-6 w-full max-w-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestão de Pedidos</h1>
            <p className="text-gray-600">Gerencie os pedidos através do kanban</p>
          </div>
          <button
            onClick={() => {/* TODO: Implementar modal de criação */}}
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
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                              #{order.orderNumber || order.id.slice(0, 8)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(order.createdAt)}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(order.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Excluir"
                          >
                            <MdDelete className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Customer */}
                        {order.customerName && (
                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Cliente:</span> {order.customerName}
                          </div>
                        )}

                        {/* Items */}
                        <div className="mb-3">
                          <div className="text-xs font-medium text-gray-600 mb-1">Itens:</div>
                          <div className="space-y-1">
                            {order.items.slice(0, 3).map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-700">
                                {item.quantity}x {item.productName}
                              </div>
                            ))}
                            {order.items.length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{order.items.length - 3} mais
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Total */}
                        <div className="border-t border-gray-200 pt-2 mb-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Total:</span>
                            <span className="font-bold text-gray-900">{formatCurrency(order.total)}</span>
                          </div>
                        </div>

                        {/* Notes */}
                        {order.notes && (
                          <div className="text-xs text-gray-600 mb-3 p-2 bg-gray-50 rounded">
                            {order.notes}
                          </div>
                        )}

                        {/* Delivery Info */}
                        {(order.deliveryAreaName || order.deliveryDriverName || order.paymentMethodName) && (
                          <div className="text-xs text-gray-500 space-y-1 mb-3">
                            {order.deliveryAreaName && (
                              <div>📍 {order.deliveryAreaName}</div>
                            )}
                            {order.deliveryDriverName && (
                              <div>🚗 {order.deliveryDriverName}</div>
                            )}
                            {order.paymentMethodName && (
                              <div>💳 {order.paymentMethodName}</div>
                            )}
                          </div>
                        )}

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
                                  handleStatusChange(order.id, nextStatus[currentIndex + 1]);
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
      </div>
    </Layout>
  );
}

