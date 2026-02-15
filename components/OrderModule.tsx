
import React from 'react';
import { Truck, Search, Plus, Trash2, ShoppingCart, Package, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface OrderModuleProps {
  productSearch: string;
  setProductSearch: (val: string) => void;
  onSearch: (term: string) => void;
  products: any[];
  cart: any[];
  setCart: (cart: any[]) => void;
  warehouses: any[];
  targetWarehouseId: number | null;
  setTargetWarehouseId: (id: number) => void;
  onSubmitOrder: () => void;
  loading: boolean;
}

export const OrderModule: React.FC<OrderModuleProps> = ({ 
  productSearch, setProductSearch, onSearch, products, cart, setCart, 
  warehouses, targetWarehouseId, setTargetWarehouseId, onSubmitOrder, loading 
}) => {
  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in pb-12">
       <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
             <div className="p-5 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest">
                  <Truck size={18} className="text-odoo-primary"/> Almacén de Despacho (SJS)
                </h3>
                <span className="text-[10px] font-black text-odoo-primary bg-odoo-primary/5 px-3 py-1 rounded-full uppercase">PRINCIPAL 1</span>
             </div>
             <div className="p-8 space-y-8">
                <div className="relative group">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-odoo-primary transition-colors" size={20}/>
                   <input 
                    type="text" 
                    placeholder="Buscar producto por nombre o código SJS..." 
                    value={productSearch} 
                    onChange={e => { setProductSearch(e.target.value); onSearch(e.target.value); }} 
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-odoo-primary focus:bg-white outline-none font-bold text-sm transition-all shadow-sm" 
                   />
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[500px] overflow-y-auto pr-3 custom-scrollbar">
                   {products.length === 0 && productSearch.length > 0 ? (
                      <div className="p-16 text-center text-gray-400 font-black uppercase text-[10px] tracking-widest bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                        No se encontraron productos en el servidor SJS
                      </div>
                   ) : products.map(p => (
                     <div key={p.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl hover:border-odoo-primary/30 hover:shadow-md transition-all group">
                        <div className="flex-1">
                           <p className="text-[12px] font-black text-gray-800 uppercase tracking-tight">{p.name}</p>
                           <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">CÓDIGO: {p.default_code || 'SJS-PROD'}</p>
                        </div>
                        <div className="flex items-center gap-8">
                           <div className="text-right">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Disponible</p>
                              <p className="text-sm font-black text-green-600">{p.qty_available} UND</p>
                           </div>
                           <button 
                            onClick={() => setCart([...cart, {...p, qty: 1}])} 
                            className="p-3 bg-odoo-primary/5 text-odoo-primary rounded-xl hover:bg-odoo-primary hover:text-white transition-all shadow-sm active:scale-90"
                           >
                              <Plus size={20}/>
                           </button>
                        </div>
                     </div>
                   ))}
                   {products.length === 0 && productSearch.length === 0 && (
                      <div className="p-16 text-center text-gray-300 font-bold uppercase text-[10px] flex flex-col items-center gap-4">
                        <Search size={40}/>
                        Escriba para buscar en el Almacén Principal
                      </div>
                   )}
                </div>
             </div>
          </div>
       </div>

       <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-[calc(100vh-140px)] overflow-hidden">
             <div className="p-5 bg-odoo-primary text-white flex justify-between items-center shadow-lg">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-3"><ShoppingCart size={20}/> Mi Pedido SJS</h3>
                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black">{cart.length} ITEMS</span>
             </div>
             
             <div className="p-6 border-b bg-gray-50/50 space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Package size={14}/> Botica de Destino
                </label>
                <select 
                  value={targetWarehouseId || ''} 
                  onChange={e => setTargetWarehouseId(Number(e.target.value))} 
                  className="w-full p-3.5 bg-white border-2 border-gray-100 rounded-xl focus:border-odoo-primary outline-none font-black text-xs shadow-sm transition-all"
                >
                   <option value="">-- SELECCIONAR SEDE --</option>
                   {warehouses.map(w => (
                     <option key={w.id} value={w.id}>{w.name}</option>
                   ))}
                </select>
                {warehouses.length === 0 && !loading && (
                   <div className="flex items-center gap-2 text-red-500 text-[9px] font-black uppercase mt-2">
                      <AlertCircle size={14}/> Error al cargar almacenes. Reintente sincronizar.
                   </div>
                )}
             </div>

             <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-6 opacity-40">
                     <Package size={60}/>
                     <p className="text-[11px] font-black uppercase tracking-widest text-center max-w-[150px]">El pedido está vacío</p>
                  </div>
                ) : cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl animate-in slide-in-from-right duration-200">
                     <div className="max-w-[160px]">
                        <p className="text-[10px] font-black text-gray-800 uppercase truncate tracking-tight">{item.name}</p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">SJS-STOCK: {item.qty_available}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          min="1" 
                          value={item.qty} 
                          onChange={e => setCart(cart.map((c, i) => i === idx ? {...c, qty: Number(e.target.value)} : c))} 
                          className="w-12 bg-white border-2 border-gray-200 rounded-lg p-2 text-center font-black text-xs outline-none focus:border-odoo-primary"
                        />
                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-500 transition-all p-1">
                          <Trash2 size={18}/>
                        </button>
                     </div>
                  </div>
                ))}
             </div>

             <div className="p-6 border-t bg-gray-50 space-y-6">
                <div className="flex justify-between items-center px-2">
                   <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Cant. Unidades</span>
                   <span className="text-2xl font-black text-odoo-primary">
                    {cart.reduce((a, b) => a + b.qty, 0)} <span className="text-[10px] font-black">UND</span>
                   </span>
                </div>
                <button 
                  onClick={onSubmitOrder} 
                  disabled={loading || cart.length === 0 || !targetWarehouseId} 
                  className="w-full bg-odoo-primary hover:bg-[#5a3c52] disabled:opacity-50 disabled:grayscale text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
                >
                   {loading ? <Loader2 className="animate-spin" size={20}/> : <><CheckCircle2 size={20}/> Confirmar Pedido</>}
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
