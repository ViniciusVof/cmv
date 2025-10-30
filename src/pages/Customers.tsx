import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import type { Customer, CustomerFormData, CustomerAddress } from '../types/customer';
import { customerService } from '../services/customerService';
import { deliveryAreaService } from '../services/deliveryAreaService';
import type { DeliveryArea } from '../types/deliveryArea';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdCheckCircle, MdClose } from 'react-icons/md';

 type SortField = 'name' | 'phone';
 type SortDirection = 'asc' | 'desc';

 export function Customers() {
   const [customers, setCustomers] = useState<Customer[]>([]);
   const [deliveryAreas, setDeliveryAreas] = useState<DeliveryArea[]>([]);
   const [loading, setLoading] = useState(true);
   const [showForm, setShowForm] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    addresses: [{ address: '', deliveryAreaId: '' }],
  });
   const [searchTerm, setSearchTerm] = useState('');
   const [sortField, setSortField] = useState<SortField>('name');
   const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

   useEffect(() => {
     loadData();
   }, []);

   const loadData = async () => {
     setLoading(true);
     try {
       const [customersData, areasData] = await Promise.all([
         customerService.getAll(),
         deliveryAreaService.getAll(),
       ]);
       setCustomers(customersData);
       setDeliveryAreas(areasData.filter(a => a.isActive));
     } catch (error) {
       console.error('Error loading data:', error);
     } finally {
       setLoading(false);
     }
   };

   const filteredAndSorted = useMemo(() => {
     let filtered = customers;
     if (searchTerm) {
       const q = searchTerm.toLowerCase();
       filtered = customers.filter(c =>
         c.name.toLowerCase().includes(q) ||
         (c.phone || '').toLowerCase().includes(q) ||
        (c.addresses || []).some(a => {
          const area = deliveryAreas.find(d => String(d.id) === String(a.deliveryAreaId));
          return (
            (a.address || '').toLowerCase().includes(q) ||
            (area?.name || '').toLowerCase().includes(q)
          );
        })
       );
     }
     const sorted = [...filtered].sort((a, b) => {
       let aValue: string = '';
       let bValue: string = '';
       switch (sortField) {
         case 'name':
           aValue = a.name.toLowerCase();
           bValue = b.name.toLowerCase();
           break;
         case 'phone':
           aValue = (a.phone || '').toLowerCase();
           bValue = (b.phone || '').toLowerCase();
           break;
       }
       if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
       if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
       return 0;
     });
     return sorted;
   }, [customers, searchTerm, sortField, sortDirection]);

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

   const handleAddAddress = () => {
     setFormData(prev => ({ 
       ...prev, 
       addresses: [...(prev.addresses || []), { address: '', deliveryAreaId: '' }] 
     }));
   };

   const handleRemoveAddress = (index: number) => {
     setFormData(prev => ({
       ...prev,
       addresses: (prev.addresses || []).filter((_, i) => i !== index)
     }));
   };

   const handleChangeAddress = (index: number, field: keyof CustomerAddress, value: string) => {
     setFormData(prev => {
       const addresses = [...(prev.addresses || [])];
       addresses[index] = { ...addresses[index], [field]: value };
       return { ...prev, addresses };
     });
   };

   const handleEdit = (customer: Customer) => {
     setEditingId(customer.id);
     setFormData({
       name: customer.name,
       phone: customer.phone || '',
       addresses: customer.addresses && customer.addresses.length > 0 
         ? customer.addresses 
         : [{ address: '', deliveryAreaId: '' }],
     });
     setShowForm(true);
   };

   const handleCancel = () => {
     setShowForm(false);
     setEditingId(null);
     setFormData({ 
       name: '', 
       phone: '', 
       addresses: [{ address: '', deliveryAreaId: '' }] 
     });
   };

   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
       const cleaned: CustomerFormData = {
         name: formData.name.trim(),
         phone: formData.phone?.trim() || undefined,
         addresses: (formData.addresses || [])
           .map(addr => ({
             address: addr.address?.trim() || undefined,
             deliveryAreaId: addr.deliveryAreaId || '',
           }))
           .filter(addr => addr.deliveryAreaId), // Mantém apenas se tiver área de entrega selecionada
       };
       if (editingId) {
         await customerService.update(editingId, cleaned);
       } else {
         await customerService.create(cleaned);
       }
       await loadData();
       handleCancel();
     } catch (error) {
       console.error('Error saving customer:', error);
       alert('Erro ao salvar cliente');
     }
   };

   const handleDelete = async (id: string) => {
     if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
     try {
       await customerService.delete(id);
       await loadData();
     } catch (error) {
       console.error('Error deleting customer:', error);
       alert('Erro ao excluir cliente');
     }
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
             <h1 className="text-3xl font-bold text-gray-800 mb-2">Clientes</h1>
             <p className="text-gray-600">Cadastre clientes com múltiplos endereços</p>
           </div>
           <button
             onClick={() => setShowForm(true)}
             className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
           >
             <MdAdd className="w-5 h-5" />
             Novo Cliente
           </button>
         </div>

         {showForm && (
           <div className="bg-white rounded-lg shadow p-6">
             <h2 className="text-xl font-semibold text-gray-800 mb-4">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
             <form onSubmit={handleSubmit} className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Nome *</label>
                   <input
                     type="text"
                     value={formData.name}
                     onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                     required
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                   />
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
                   <input
                     type="tel"
                     value={formData.phone || ''}
                     onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                     className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                     placeholder="(00) 00000-0000"
                   />
                 </div>

                 <div className="md:col-span-2">
                   <div className="flex items-center justify-between mb-2">
                     <label className="block text-sm font-medium text-gray-700">Endereços</label>
                     <button type="button" onClick={handleAddAddress} className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                       <MdAdd className="w-4 h-4" /> Adicionar endereço
                     </button>
                   </div>
                   <div className="space-y-4">
                     {(formData.addresses || []).map((addr, idx) => (
                       <div key={idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                         <div className="flex items-center justify-between">
                           <span className="text-sm font-medium text-gray-700">Endereço {idx + 1}</span>
                           {(formData.addresses || []).length > 1 && (
                             <button type="button" onClick={() => handleRemoveAddress(idx)} className="text-red-600 hover:text-red-800">
                               <MdDelete className="w-5 h-5" />
                             </button>
                           )}
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Endereço (opcional)</label>
                             <input
                               type="text"
                               value={addr.address || ''}
                               onChange={(e) => handleChangeAddress(idx, 'address', e.target.value)}
                               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                               placeholder="Ex: Rua Exemplo, 123"
                             />
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Bairro (Área de Entrega) *</label>
                             <select
                               value={addr.deliveryAreaId || ''}
                               onChange={(e) => handleChangeAddress(idx, 'deliveryAreaId', e.target.value)}
                               required
                               className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                             >
                               <option value="">Selecione um bairro</option>
                               {deliveryAreas.map(area => (
                                 <option key={area.id} value={String(area.id)}>
                                   {area.name}
                                 </option>
                               ))}
                             </select>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
               <div className="flex gap-2">
                 <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                   <MdCheckCircle className="w-5 h-5" /> Salvar
                 </button>
                 <button type="button" onClick={handleCancel} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2">
                   <MdClose className="w-5 h-5" /> Cancelar
                 </button>
               </div>
             </form>
           </div>
         )}

         <div className="bg-white rounded-lg shadow p-4">
           <div className="flex items-center gap-4">
             <div className="flex-1 relative">
               <input
                 type="text"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="Buscar por nome, telefone ou endereço..."
                 className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
               />
               <MdSearch className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
             </div>
             {searchTerm && (
               <button onClick={() => setSearchTerm('')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Limpar</button>
             )}
             <div className="text-sm text-gray-600">{filteredAndSorted.length} de {customers.length} cliente{filteredAndSorted.length !== 1 ? 's' : ''}</div>
           </div>
         </div>

         <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden w-full">
           <div className="overflow-x-auto w-full">
             <table className="w-full" style={{ minWidth: 'max-content' }}>
               <thead className="bg-gray-50 border-b border-gray-200">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                     <button onClick={() => handleSort('name')} className="flex items-center gap-2 hover:text-gray-700 transition-colors">
                       Nome
                       <SortIcon field="name" />
                     </button>
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                     <button onClick={() => handleSort('phone')} className="flex items-center gap-2 hover:text-gray-700 transition-colors">
                       Telefone
                       <SortIcon field="phone" />
                     </button>
                   </th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Endereços</th>
                   <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                 {filteredAndSorted.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="px-6 py-8 text-center text-gray-500">{searchTerm ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado.'}</td>
                   </tr>
                 ) : (
                   filteredAndSorted.map((c) => (
                     <tr key={c.id} className="hover:bg-gray-50">
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm font-medium text-gray-900">{c.name}</div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="text-sm text-gray-600">{c.phone || '-'}</div>
                       </td>
                       <td className="px-6 py-4">
                         <div className="text-sm text-gray-600 max-w-xl">
                           {c.addresses && c.addresses.length > 0 ? (
                             <div className="space-y-1">
                               {c.addresses.map((addr, idx) => {
                                 const area = deliveryAreas.find(a => String(a.id) === String(addr.deliveryAreaId));
                                 return (
                                   <div key={idx} className="text-xs">
                                     {addr.address && <span>{addr.address}</span>}
                                     {area && (
                                       <span className={addr.address ? ' ml-1' : ''}>
                                         {addr.address && ' - '}
                                         <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                           {area.name}
                                         </span>
                                       </span>
                                     )}
                                   </div>
                                 );
                               })}
                             </div>
                           ) : (
                             '-'
                           )}
                         </div>
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-center">
                         <div className="flex justify-center gap-2">
                           <button onClick={() => handleEdit(c)} className="text-blue-600 hover:text-blue-800" title="Editar">
                             <MdEdit className="w-5 h-5" />
                           </button>
                           <button onClick={() => handleDelete(c.id)} className="text-red-600 hover:text-red-800" title="Excluir">
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
