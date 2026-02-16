
import React, { useMemo } from 'react';
import { 
  FileSpreadsheet, Store, X, Package, ListChecks, Download, 
  ChevronRight, TrendingUp, Users, CreditCard, BarChart3, 
  PieChart as PieIcon, ArrowUpRight, ArrowDownRight, Info,
  Medal, ShoppingBag, Wallet, Calendar
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

  const exportProfessionalExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Hoja de Resumen Ejecutivo
      const summaryData = [
        ["REPORTE EJECUTIVO DE VENTAS - BOTICAS SAN JOSÉ"],
        ["Fecha de Generación:", new Date().toLocaleString()],
        [""],
        ["INDICADOR", "VALOR"],
        ["Venta Bruta Total", `S/ ${reportData.totalGlobal.toFixed(2)}`],
        ["Total de Tickets", reportData.totalTicketsGlobal],
        ["Ticket Promedio Global", `S/ ${reportData.avgTicketGlobal.toFixed(2)}`],
        ["Sedes con Venta", reportData.items.filter(i => i.total > 0).length],
        ["Sedes Operativas Ahora", reportData.items.filter(i => i.state === 'opened').length]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

      // 2. Hoja de Desempeño por Sedes
      const sedesData = reportData.items.map(item => ({
        "BOTICA / PUNTO": item.name,
        "ESTADO": item.state === 'opened' ? 'ABIERTO' : 'CERRADO',
        "TOTAL VENTAS (S/)": item.total,
        "CANT. TICKETS": item.tickets,
        "TICKET PROMEDIO (S/)": item.avgTicket,
        "% PARTICIPACIÓN": `${((item.total / reportData.totalGlobal) * 100).toFixed(2)}%`
      }));
      const wsSedes = XLSX.utils.json_to_sheet(sedesData);
      XLSX.utils.book_append_sheet(wb, wsSedes, "Sedes");

      // 3. Hoja de Top Productos Consolidado
      const globalProductMap: Record<string, any> = {};
      reportData.items.forEach(sede => {
        sede.topProducts.forEach((p: any) => {
          if (!globalProductMap[p.name]) globalProductMap[p.name] = { qty: 0, total: 0 };
          globalProductMap[p.name].qty += p.qty;
          globalProductMap[p.name].total += p.total;
        });
      });
      const productsData = Object.entries(globalProductMap)
        .sort((a: any, b: any) => b[1].qty - a[1].qty)
        .map(([name, stats]: any) => ({
          "PRODUCTO": name,
          "UNIDADES VENDIDAS": stats.qty,
          "RECAUDACIÓN (S/)": stats.total
        }));
      const wsProducts = XLSX.utils.json_to_sheet(productsData);
      XLSX.utils.book_append_sheet(wb, wsProducts, "Ranking Productos");

      // 4. Hoja de Métodos de Pago
      const paymentsData = Object.entries(reportData.globalPayments).map(([method, amount]) => ({
        "MÉTODO DE PAGO": method,
        "MONTO TOTAL (S/)": amount,
        "% DEL MIX": `${((amount as number / reportData.totalGlobal) * 100).toFixed(2)}%`
      }));
      const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
      XLSX.utils.book_append_sheet(wb, wsPayments, "Mix de Pagos");

      // Generar Archivo
      const fileName = `Reporte_SanJose_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      alert("Hubo un error al generar el archivo Excel.");
    }
  };

  const currentDetailData = selectedPos ? reportData.items.find(i => i.id === selectedPos.id) : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-24 animate-fade">
      {/* Header BI */}
      <div className="bg-white p-6 border border-odoo-border rounded shadow-sm flex flex-col md:row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-odoo-primary/10 rounded-xl text-odoo-primary">
            <BarChart3 size={28}/>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Intelligence Hub San José</h2>
            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
              Auditoría Avanzada de Operaciones POS
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportProfessionalExcel}
            className="o-btn o-btn-primary gap-2 py-3 px-6 shadow-lg shadow-odoo-primary/20 hover:-translate-y-0.5"
          >
            <FileSpreadsheet size={18} /> Exportar Reporte Ejecutivo (.xlsx)
          </button>
        </div>
      </div>

      {/* KPIs Globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm hover:border-odoo-primary/30 transition-all cursor-default group">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2 group-hover:text-odoo-primary">Venta Bruta Total</p>
          <div className="flex items-baseline gap-2">
            <h4 className="text-2xl font-black text-gray-800">S/ {reportData.totalGlobal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
            <ArrowUpRight size={16} className="text-green-500" />
          </div>
        </div>
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm hover:border-odoo-primary/30 transition-all">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Ticket Promedio</p>
          <h4 className="text-2xl font-black text-odoo-primary">S/ {reportData.avgTicketGlobal.toLocaleString('es-PE', {minimumFractionDigits: 2})}</h4>
        </div>
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm hover:border-odoo-primary/30 transition-all">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Transacciones</p>
          <h4 className="text-2xl font-black text-gray-800">{reportData.totalTicketsGlobal} <span className="text-xs font-bold opacity-40">OPERACIONES</span></h4>
        </div>
        <div className="bg-white p-5 border border-odoo-border rounded shadow-sm hover:border-odoo-primary/30 transition-all">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Estado de Cadena</p>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></div>
            <h4 className="text-2xl font-black text-gray-800 uppercase">{reportData.items.filter(i => i.state === 'opened').length} EN LÍNEA</h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-odoo-border rounded shadow-sm overflow-hidden flex flex-col">
           <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
             <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
               <Store size={14} className="text-odoo-primary"/> Desempeño Consolidado por Sede
             </h3>
           </div>
           <div className="flex-1 overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase border-b">
                 <tr>
                   <th className="px-6 py-4">Punto de Venta</th>
                   <th className="px-6 py-4 text-center">Estado</th>
                   <th className="px-6 py-4 text-right">Participación</th>
                   <th className="px-6 py-4 text-right">Total Venta</th>
                   <th className="px-6 py-4 text-right w-16"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {reportData.items.map((item, idx) => (
                   <tr key={idx} className="hover:bg-odoo-primary/5 transition-colors group">
                     <td className="px-6 py-4">
                       <span className="text-xs font-bold text-gray-700 uppercase">{item.name}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                       <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${item.state === 'opened' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                         {item.state === 'opened' ? 'ABIERTA' : 'CERRADA'}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-right">
                       <div className="flex flex-col items-end">
                         <span className="text-[10px] font-black text-gray-400">
                           {reportData.totalGlobal > 0 ? ((item.total / reportData.totalGlobal) * 100).toFixed(1) : 0}%
                         </span>
                         <div className="w-12 h-1 bg-gray-100 rounded-full mt-1">
                            <div className="h-full bg-odoo-primary/30 rounded-full" style={{ width: `${(item.total / reportData.totalGlobal) * 100}%` }}></div>
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-4 text-right font-black text-gray-800 text-sm">S/ {item.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                     <td className="px-6 py-4 text-right">
                       <button onClick={() => onSelect(item)} className="p-2 text-gray-300 hover:text-odoo-primary transition-all group-hover:translate-x-1">
                         <ChevronRight size={18}/>
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

        <div className="bg-white border border-odoo-border rounded shadow-sm p-6">
           <h3 className="text-[10px] font-black text-gray-500 uppercase mb-6 flex items-center gap-2 tracking-widest">
             <Wallet size={16} className="text-odoo-primary"/> Mix de Pagos Global
           </h3>
           <div className="space-y-6">
             {(Object.entries(reportData.globalPayments) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([method, amount], i) => (
               <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase">
                    <span className="text-gray-500">{method}</span>
                    <span className="text-gray-800">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-odoo-primary h-full transition-all duration-1000" style={{ width: `${(amount / reportData.totalGlobal) * 100}%` }}></div>
                  </div>
                  <p className="text-right text-[9px] font-bold text-gray-400">
                    {((amount / reportData.totalGlobal) * 100).toFixed(1)}% del total
                  </p>
               </div>
             ))}
             {Object.keys(reportData.globalPayments).length === 0 && (
               <div className="py-20 text-center">
                 <CreditCard size={32} className="mx-auto text-gray-200 mb-2"/>
                 <p className="text-xs text-gray-400 italic">No hay transacciones registradas</p>
               </div>
             )}
           </div>
        </div>
      </div>

      {/* Detalle Individual (Modal lateral) */}
      {selectedPos && currentDetailData && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="px-6 py-6 border-b flex justify-between items-center bg-odoo-primary text-white shadow-lg">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                     <Store size={24}/>
                   </div>
                   <div>
                     <h3 className="text-lg font-black uppercase leading-none tracking-tight">{selectedPos.name}</h3>
                     <p className="text-[10px] opacity-70 font-bold uppercase mt-1 tracking-widest">Auditoría Individual de Punto</p>
                   </div>
                </div>
                <button onClick={onCloseDetail} className="p-2 hover:bg-black/10 rounded-full transition-colors"><X size={24}/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Venta Bruta Sede</p>
                      <p className="text-2xl font-black text-gray-800">S/ {currentDetailData.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Ticket Promedio</p>
                      <p className="text-2xl font-black text-odoo-primary">S/ {currentDetailData.avgTicket.toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
                     <Wallet size={14} className="text-odoo-primary"/> Métodos de Pago Recibidos
                   </h4>
                   <div className="grid grid-cols-2 gap-3">
                     {Object.entries(currentDetailData.payments).map(([method, amount]: any, i) => (
                       <div key={i} className="p-4 border border-gray-100 rounded-xl flex justify-between items-center bg-white shadow-sm group hover:border-odoo-primary/30 transition-all">
                          <span className="text-[10px] font-black text-gray-500 uppercase">{method}</span>
                          <span className="text-xs font-black text-gray-800 uppercase">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                       </div>
                     ))}
                   </div>
                </div>

                <div>
                   <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 flex items-center gap-2 tracking-[0.2em]">
                     <ShoppingBag size={14} className="text-odoo-primary"/> Ranking de Productos (Esta Sede)
                   </h4>
                   <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase border-b">
                           <tr>
                             <th className="px-5 py-3">Producto</th>
                             <th className="px-5 py-3 text-right">Cantidad</th>
                             <th className="px-5 py-3 text-right">Total Bruto</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {currentDetailData.topProducts.map((p: any, i: number) => (
                             <tr key={i} className="text-[11px] group hover:bg-gray-50 transition-colors">
                               <td className="px-5 py-4 font-bold text-gray-700 uppercase group-hover:text-odoo-primary">{p.name}</td>
                               <td className="px-5 py-4 text-right font-black text-gray-500">{p.qty} <span className="text-[9px] opacity-40">UND</span></td>
                               <td className="px-5 py-4 text-right font-black text-gray-800">S/ {p.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}</td>
                             </tr>
                           ))}
                           {currentDetailData.topProducts.length === 0 && (
                             <tr><td colSpan={3} className="py-20 text-center text-gray-400 italic text-xs uppercase font-bold tracking-widest opacity-30">Sin movimientos</td></tr>
                           )}
                        </tbody>
                      </table>
                   </div>
                </div>
             </div>
             
             <div className="p-6 border-t bg-gray-50">
                <button onClick={onCloseDetail} className="w-full o-btn o-btn-secondary py-4 font-black uppercase tracking-[0.2em] text-[10px] shadow-sm">Cerrar Detalle de Sede</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
