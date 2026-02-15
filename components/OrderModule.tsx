
import React from 'react';
import { Truck, Search, Plus, Trash2, ShoppingCart, Package, CheckCircle2, Loader2 } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in">
       <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
             <div className="p-4 bg-gray-50 border-b">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                  <Truck size={18} className="text-odoo-primary"/> Suministro Interno (Principal 1)
                </h3>
             </div>
             <div className="p-6 space-y-6">
                <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-odoo-primary transition-colors" size={18}/>
                   <input 
                    type="text" 
                    placeholder="Buscar producto por nombre o código SJS..." 
                    value={productSearch} 
                    onChange={e => { setProductSearch(e.target.value); onSearch(e.target.value); }} 
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded focus:border-odoo-primary focus:bg-white focus:ring-1 focus:ring-odoo-primary outline-none font-bold text-sm transition-all" 
                   />
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
                   {products.length === 0 && productSearch.length > 0 ? (
                      <div className="p-12 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest bg-gray-50/50 rounded border border-dashed">
                        No se encontraron productos con stock en Principal 1
                      </div>
                   ) : products.map(p => (
                     <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded hover:bg-gray-50 hover:border-odoo-primary/20 transition-all group">
                        <div>
                           <p className="text-[11px] font-black text-gray-800 uppercase">{p.name}</p>
                           <p className="text-[9px] font-bold text-gray-400 uppercase">{p.default_code || 'SJS-PROD'}</p>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="text-right">
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Disp. Principal</p>
                              <p className="text-xs font-black text-green-600">{p.qty_available} UND</p>
                           </div>
                           <button 
                            onClick={() => setCart([...cart, {...p, qty: 1}])} 
                            className="p-2 bg-white text-odoo-primary rounded border border-gray-200 hover:bg-odoo-primary hover:text-white transition-all shadow-sm"
                           >
                              <Plus size={16}/>
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
       </div>

       <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-gray-200 rounded shadow-sm flex flex-col h-[calc(100vh-120px)] overflow-hidden">
             <div className="p-4 bg-odoo-primary text-white flex justify-between items-center">
                <h3 className="text-sm font-bold flex items-center gap-2"><ShoppingCart size={18}/> Mi Pedido</h3>
                <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold">{cart.length} ITEMS</span>
             </div>
             
             <div className="p-4 border-b bg-gray-50/50">
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-tight mb-2 block">Botica de Destino</label>
                <select 
                  value={targetWarehouseId || ''} 
                  onChange={e => setTargetWarehouseId(Number(e.target.value))} 
                  className="w-full p-2.5 bg-white border border-gray-300 rounded focus:border-odoo-primary outline-none font-bold text-xs"
                >
                   <option value="">-- Seleccionar Sede --</option>
                   {warehouses.filter(w => !w.name.toUpperCase().includes('PRINCIPAL')).map(w => (
                     <option key={w.id} value={w.id}>{w.name}</option>
                   ))}
                </select>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-50">
                     <Package size={48}/>
                     <p className="text-[10px] font-black uppercase tracking-widest text-center">No hay productos en el pedido</p>
                  </div>
                ) : cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border rounded transition-all">
                     <div className="max-w-[140px]">
                        <p className="text-[10px] font-black text-gray-800 uppercase truncate">{item.name}</p>
                        <p className="text-[8px] font-bold text-gray-400">DISP: {item.qty_available} UND</p>
                     </div>
                     <div className="flex items-center gap-2">
                        <input 
                          type="number" 
                          min="1" 
                          value={item.qty} 
                          onChange={e => setCart(cart.map((c, i) => i === idx ? {...c, qty: Number(e.target.value)} : c))} 
                          className="w-10 bg-white border border-gray-300 rounded p-1 text-center font-bold text-xs outline-none focus:border-odoo-primary"
                        />
                        <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={16}/>
                        </button>
                     </div>
                  </div>
                ))}
             </div>

             <div className="p-4 border-t bg-gray-50 space-y-4">
                <div className="flex justify-between items-center font-bold">
                   <span className="text-[11px] text-gray-500 uppercase">Cantidad Total</span>
                   <span className="text-lg text-odoo-primary">
                    {cart.reduce((a, b) => a + b.qty, 0)} <span className="text-[10px]">UND</span>
                   </span>
                </div>
                <button 
                  onClick={onSubmitOrder} 
                  disabled={loading || cart.length === 0} 
                  className="w-full bg-odoo-primary hover:bg-[#5a3c52] disabled:opacity-50 text-white py-4 rounded font-bold text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2"
                >
                   {loading ? <Loader2 className="animate-spin" size={18}/> : <><CheckCircle2 size={16}/> Confirmar Pedido</>}
                </button>
             </div>
          </div>
       </div>
    </div>
  );
};
