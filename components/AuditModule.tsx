
import React, { useMemo } from 'react';
import { 
  FileSpreadsheet, Store, X, Package, ListChecks, Download, 
  ChevronRight, TrendingUp, Users, CreditCard, BarChart3, 
  PieChart as PieIcon, ArrowUpRight, ArrowDownRight, Info,
  Medal, ShoppingBag, Wallet
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import * as XLSX from 'xlsx';

interface AuditModuleProps {
  posConfigs: any[];
  posSalesData: any;
  onSelect: (pos: any) => void;
  selectedPos: any | null;
  onCloseDetail: () => void;
}

const COLORS = ['#714B67', '#017e84', '#E4A11B', '#DC3545', '#4c4c4c', '#6c757d'];

export const AuditModule: React.FC<AuditModuleProps> = ({ posConfigs, posSalesData, onSelect, selectedPos, onCloseDetail }) => {
  
  const reportData = useMemo(() => {
    const data = posConfigs.map(c => {
      const stats = posSalesData[c.id] || { totalSales: 0, count: 0, topProducts: [], payments: {} };
      return {
        id: c.id,
        name: c.name,
        total: stats.totalSales || 0,
        tickets: stats.count || 0,
        avgTicket: stats.count > 0 ? (stats.totalSales / stats.count) : 0,
        state: stats.isOnline ? 'opened' : 'closed',
        topProducts: stats.topProducts || [],
        payments: stats.payments || {}
      };
    }).sort((a, b) => b.total - a.total);

    const totalGlobal = data.reduce((acc, curr) => acc + curr.total, 0);
    const totalTicketsGlobal = data.reduce((acc, curr) => acc + curr.tickets, 0);

    // Consolidar Metodos de Pago Globales
    const globalPayments: Record<string, number> = {};
    data.forEach(item => {
      Object.entries(item.payments).forEach(([method, amount]) => {
        globalPayments[method] = (globalPayments[method] || 0) + (amount as number);
      });
    });

    return {
      items: data,
      totalGlobal,
      totalTicketsGlobal,
      avgTicketGlobal: totalTicketsGlobal > 0 ? totalGlobal / totalTicketsGlobal : 0,
      globalPayments
    };
  }, [posConfigs, posSalesData]);

  const currentDetailData = selectedPos ? reportData.items.find(i => i.id === selectedPos.id) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-24 animate-fade">
      {/* Header BI */}
      <div className="bg-white p-6 border border-odoo-border rounded shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Centro de Inteligencia de Ventas</h2>
          <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={14} className="text-odoo-primary"/> Análisis de Rendimiento San José
          </p>
        </div>
        <button onClick={() => {}} className="o-btn o-btn-secondary gap-2 py-2.5">
          <Download size={16} /> Exportar Reporte Ejecutivo
        </button>
      </div>

      {/* KPIs Globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Venta Bruta Consolidada</p>
          <h4 className="text-xl font-black text-gray-800 uppercase">S/ {reportData.totalGlobal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
        </div>
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Ticket Promedio Global</p>
          <h4 className="text-xl font-black text-odoo-primary uppercase">S/ {reportData.avgTicketGlobal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
        </div>
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Sedes Operando Ahora</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <h4 className="text-xl font-black text-gray-800 uppercase">{reportData.items.filter(i => i.state === 'opened').length} BOTICAS</h4>
          </div>
        </div>
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Método Preferido</p>
          <h4 className="text-xl font-black text-amber-600 uppercase">
            {/* Fix: Added type casting to avoid arithmetic operation errors in sort */}
            {Object.entries(reportData.globalPayments).sort((a: [string, any], b: [string, any]) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'N/A'}
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tabla Maestra */}
        <div className="lg:col-span-2 bg-white border border-odoo-border rounded shadow-sm overflow-hidden">
           <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
             <h3 className="text-xs font-black text-gray-500 uppercase">Reporte por Punto de Venta</h3>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase border-b">
                 <tr>
                   <th className="px-6 py-4">Sede</th>
                   <th className="px-6 py-4 text-center">Estado</th>
                   <th className="px-6 py-4 text-right">Tickets</th>
                   <th className="px-6 py-4 text-right">Venta Total</th>
                   <th className="px-6 py-4 text-right w-16"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {reportData.items.map((item, idx) => (
                   <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                     <td className="px-6 py-4">
                       <span className="text-xs font-bold text-gray-700 uppercase">{item.name}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${item.state === 'opened' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                         {item.state === 'opened' ? 'OPERANDO' : 'CERRADA'}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-right font-bold text-gray-500 text-xs">{item.tickets} UNI</td>
                     <td className="px-6 py-4 text-right font-black text-gray-800 text-sm">S/ {item.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                     <td className="px-6 py-4 text-right">
                       <button onClick={() => onSelect(item)} className="p-2 text-gray-300 hover:text-odoo-primary transition-colors">
                         <ChevronRight size={18}/>
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        {/* Métodos de Pago Globales */}
        <div className="bg-white border border-odoo-border rounded shadow-sm p-6">
           <h3 className="text-xs font-black text-gray-500 uppercase mb-6 flex items-center gap-2">
             <Wallet size={16} className="text-odoo-primary"/> Mix de Pagos (Total Cadena)
           </h3>
           <div className="space-y-4">
             {/* Fix: Added explicit type casting to number for sort and map parameters to resolve arithmetic errors */}
             {(Object.entries(reportData.globalPayments) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([method, amount], i) => (
               <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="text-gray-500">{method}</span>
                    <span className="text-gray-800">S/ {amount.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-odoo-primary h-full" style={{ width: `${(amount / reportData.totalGlobal) * 100}%` }}></div>
                  </div>
               </div>
             ))}
             {Object.keys(reportData.globalPayments).length === 0 && (
               <p className="text-center py-10 text-xs text-gray-400 italic">No hay datos de pago</p>
             )}
           </div>
        </div>
      </div>

      {/* Ranking de Productos Top */}
      <div className="bg-white border border-odoo-border rounded shadow-sm p-6">
        <h3 className="text-xs font-black text-gray-500 uppercase mb-6 flex items-center gap-2">
          <ShoppingBag size={16} className="text-odoo-primary"/> Top 10 Productos con Mayor Rotación (General)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
           {/* Consolidar top global */}
           {(() => {
             const globalProductMap: Record<string, any> = {};
             reportData.items.forEach(sede => {
               sede.topProducts.forEach((p:any) => {
                 if (!globalProductMap[p.name]) globalProductMap[p.name] = { qty: 0 };
                 globalProductMap[p.name].qty += p.qty;
               });
             });
             return Object.entries(globalProductMap)
               .sort((a:any, b:any) => b[1].qty - a[1].qty)
               .slice(0, 5)
               .map(([name, data]: any, i) => (
                 <div key={i} className="p-4 border border-gray-100 rounded-lg flex flex-col items-center text-center group hover:border-odoo-primary/20 transition-all">
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-odoo-primary mb-3 group-hover:bg-odoo-primary group-hover:text-white transition-all">
                      <Medal size={20}/>
                    </div>
                    <p className="text-[10px] font-black text-gray-700 uppercase h-8 overflow-hidden line-clamp-2">{name}</p>
                    <p className="mt-2 text-sm font-black text-odoo-primary">{data.qty} <span className="text-[10px] opacity-60">UND</span></p>
                 </div>
               ));
           })()}
        </div>
      </div>

      {/* Detalle Individual */}
      {selectedPos && currentDetailData && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
             <div className="px-6 py-5 border-b flex justify-between items-center bg-odoo-primary text-white">
                <div className="flex items-center gap-3">
                   <Store size={20}/>
                   <div>
                     <h3 className="text-lg font-black uppercase leading-none">{selectedPos.name}</h3>
                     <p className="text-[10px] opacity-70 font-bold uppercase mt-1">Auditoría de Ventas por Punto</p>
                   </div>
                </div>
                <button onClick={onCloseDetail} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-gray-50 p-4 rounded-xl border">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Venta Total Bruta</p>
                      <p className="text-2xl font-black text-gray-800">S/ {currentDetailData.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="bg-gray-50 p-4 rounded-xl border">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Ticket Promedio</p>
                      <p className="text-2xl font-black text-odoo-primary">S/ {currentDetailData.avgTicket.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                </div>

                {/* Métodos de Pago por Sede */}
                <div>
                   <h4 className="text-xs font-black text-gray-500 uppercase mb-4 flex items-center gap-2">
                     <Wallet size={14}/> Métodos de Pago Recibidos
                   </h4>
                   <div className="grid grid-cols-2 gap-3">
                     {Object.entries(currentDetailData.payments).map(([method, amount]: any, i) => (
                       <div key={i} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">{method}</span>
                          <span className="text-xs font-black text-gray-800 uppercase">S/ {amount.toLocaleString()}</span>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Top Productos por Sede */}
                <div>
                   <h4 className="text-xs font-black text-gray-500 uppercase mb-4 flex items-center gap-2">
                     <ShoppingBag size={14}/> Productos Más Vendidos en esta Sede
                   </h4>
                   <div className="border rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase border-b">
                           <tr>
                             <th className="px-4 py-3">Producto</th>
                             <th className="px-4 py-3 text-right">Cantidad</th>
                             <th className="px-4 py-3 text-right">Total Bruto</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {currentDetailData.topProducts.map((p: any, i: number) => (
                             <tr key={i} className="text-xs">
                               <td className="px-4 py-3 font-bold text-gray-600 uppercase">{p.name}</td>
                               <td className="px-4 py-3 text-right font-bold">{p.qty} UND</td>
                               <td className="px-4 py-3 text-right font-black">S/ {p.total.toLocaleString()}</td>
                             </tr>
                           ))}
                           {currentDetailData.topProducts.length === 0 && (
                             <tr><td colSpan={3} className="py-10 text-center text-gray-400 italic">No hay productos registrados</td></tr>
                           )}
                        </tbody>
                      </table>
                   </div>
                </div>
             </div>
             
             <div className="p-6 border-t bg-gray-50">
                <button onClick={onCloseDetail} className="w-full o-btn o-btn-secondary py-3 font-bold uppercase tracking-widest text-xs">Cerrar Detalle</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
