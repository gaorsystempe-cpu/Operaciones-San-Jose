
import React from 'react';
import { TrendingUp, FileSpreadsheet, Store, ChevronRight, X, User as UserIcon, Calendar, Info, Package, ListChecks, DollarSign, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AuditModuleProps {
  posConfigs: any[];
  posSalesData: any;
  onSelect: (pos: any) => void;
  selectedPos: any | null;
  onCloseDetail: () => void;
}

export const AuditModule: React.FC<AuditModuleProps> = ({ posConfigs, posSalesData, onSelect, selectedPos, onCloseDetail }) => {
  
  // Exportación Global Consolidada
  const exportGlobalConsolidated = () => {
    const workbook = XLSX.utils.book_new();
    
    // Hoja 1: Resumen por Botica
    const globalSummary = posConfigs.map(c => {
      const d = posSalesData[c.id];
      return {
        'Botica': c.name,
        'Estado Odoo': d?.rawState || 'N/A',
        'Venta Total (S/)': d?.totalSales || 0,
        'Costo Total (S/)': d?.totalCost || 0,
        'Utilidad Bruta (S/)': d?.margin || 0,
        'Margen %': d?.totalSales > 0 ? ((d.margin / d.totalSales) * 100).toFixed(2) + '%' : '0%',
        'Sesiones': d?.count || 0
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(globalSummary), "Resumen General");

    // Hoja 2: Detalle de Productos (Top 100 Global)
    const allProducts: Record<string, any> = {};
    Object.values(posSalesData).forEach((data: any) => {
      data.products.forEach((p: any) => {
        if (!allProducts[p.name]) allProducts[p.name] = { qty: 0, total: 0, cost: 0, margin: 0 };
        allProducts[p.name].qty += p.qty;
        allProducts[p.name].total += p.total;
        allProducts[p.name].cost += p.cost;
        allProducts[p.name].margin += p.margin;
      });
    });
    const productData = Object.entries(allProducts).map(([name, d]) => ({ 'Producto': name, ...d }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productData), "Top Productos Global");

    XLSX.writeFile(workbook, `Reporte_Consolidado_SJS_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  const exportPosDetail = (posId: number) => {
    const data = posSalesData[posId];
    if (!data) return;

    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.sessions.map((s: any) => ({
      'ID': s.id, 'Cajero': s.user_id[1], 'Inicio': s.start_at, 'Estado': s.state, 'Total': s.total_payments_amount
    }))), "Sesiones");

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.products.map((p: any) => ({
      'Producto': p.name, 'Cant': p.qty, 'Venta': p.total, 'Costo': p.cost, 'Utilidad': p.margin
    }))), "Productos");

    XLSX.writeFile(workbook, `Auditoria_${posConfigs.find(c => c.id === posId)?.name.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="bg-white border border-gray-200 rounded-sm p-6 flex justify-between items-center shadow-sm">
        <div className="space-y-1">
          <h3 className="font-black text-gray-800 flex items-center gap-3 uppercase text-sm tracking-widest">
            <TrendingUp size={22} className="text-odoo-primary"/> Auditoría de Rentabilidad SJS
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Análisis de margen y control de activos por sede</p>
        </div>
        <button 
          onClick={exportGlobalConsolidated}
          className="bg-odoo-primary hover:bg-[#5a3c52] text-white px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3 transition-all shadow-lg active:scale-95"
        >
          <Download size={18} /> Exportar Consolidado Global (Excel)
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posConfigs.map(c => (
          <div 
            key={c.id} 
            onClick={() => onSelect(c)} 
            className="bg-white border border-gray-200 rounded-sm shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden group border-b-4 border-b-gray-200 hover:border-b-odoo-primary"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-8">
                <div className={`w-14 h-14 rounded-lg flex items-center justify-center transition-all shadow-inner ${posSalesData[c.id]?.isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-300 group-hover:text-odoo-primary'}`}>
                  <Store size={28}/>
                </div>
                {posSalesData[c.id]?.isOnline && (
                  <div className="flex flex-col items-end">
                    <span className="bg-green-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase mb-1 shadow-sm">Abierta</span>
                    <span className="text-[8px] font-black text-green-500 tracking-widest animate-pulse">ODOO SYNC</span>
                  </div>
                )}
              </div>
              <h4 className="font-black text-gray-800 uppercase text-base mb-1 truncate tracking-tight">{c.name}</h4>
              <p className="text-[10px] text-gray-400 font-black mb-8 border-l-2 border-odoo-primary pl-2 uppercase tracking-widest">San José S.A.C.</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50/80 p-4 rounded-sm border border-gray-100">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Venta Bruta</p>
                  <p className="text-sm font-black text-gray-800">S/ {(posSalesData[c.id]?.totalSales || 0).toLocaleString('es-PE')}</p>
                </div>
                <div className="bg-green-50/50 p-4 rounded-sm border border-green-100">
                  <p className="text-[8px] font-black text-green-600 uppercase tracking-widest mb-1">Utilidad</p>
                  <p className="text-sm font-black text-green-700">S/ {(posSalesData[c.id]?.margin || 0).toLocaleString('es-PE')}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
             <div className="p-8 border-b flex justify-between items-center bg-gray-50 shadow-sm">
                <div>
                   <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{selectedPos.name}</h3>
                   <p className="text-[10px] font-black text-odoo-primary uppercase tracking-[0.3em] mt-2 border-l-4 border-odoo-primary pl-3">BI Profit Intelligence Report</p>
                </div>
                <button onClick={onCloseDetail} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all group"><X size={30} className="group-hover:rotate-90 transition-transform"/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
                {/* Métricas Financieras */}
                <section className="grid grid-cols-2 gap-6">
                   <div className="p-6 bg-odoo-primary/5 border-l-4 border-odoo-primary rounded-r-lg">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Ingresos Totales</p>
                      <p className="text-2xl font-black text-odoo-primary tracking-tighter">S/ {(posSalesData[selectedPos.id]?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="p-6 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                      <p className="text-[10px] font-black text-green-600 uppercase mb-2">Utilidad Estimada</p>
                      <p className="text-2xl font-black text-green-700 tracking-tighter">S/ {(posSalesData[selectedPos.id]?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                </section>

                {/* Métodos de Pago */}
                <section className="space-y-4">
                   <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] border-b-2 border-gray-100 pb-3 flex items-center gap-3">
                     <ListChecks size={18} className="text-odoo-primary"/> Arqueo por Modalidad
                   </h4>
                   <div className="grid grid-cols-1 gap-3">
                      {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([method, amount]: [any, any]) => (
                        <div key={method} className="p-5 bg-white border border-gray-100 rounded-sm shadow-sm flex justify-between items-center hover:border-odoo-primary transition-colors">
                           <span className="text-[11px] font-black text-gray-500 uppercase">{method}</span>
                           <span className="text-base font-black text-gray-800">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                        </div>
                      ))}
                   </div>
                </section>

                {/* Top Productos con Margen */}
                <section className="space-y-4">
                   <div className="flex justify-between items-center border-b-2 border-gray-100 pb-3">
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <Package size={18} className="text-odoo-primary"/> Análisis de Rentabilidad por SKU
                      </h4>
                      <span className="text-[9px] font-black text-odoo-primary bg-odoo-primary/10 px-2 py-0.5 rounded uppercase">TOP 20</span>
                   </div>
                   <div className="bg-white border rounded-sm shadow-sm overflow-hidden">
                      <div className="grid grid-cols-12 bg-gray-50 p-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b">
                         <div className="col-span-6">Producto</div>
                         <div className="col-span-2 text-center">Cant</div>
                         <div className="col-span-4 text-right">Utilidad (S/)</div>
                      </div>
                      <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {(posSalesData[selectedPos.id]?.products || []).slice(0, 20).map((p: any, idx: number) => (
                          <div key={idx} className="grid grid-cols-12 p-4 items-center hover:bg-gray-50 transition-colors">
                             <div className="col-span-6">
                                <p className="text-[10px] font-black text-gray-700 uppercase truncate">{p.name}</p>
                             </div>
                             <div className="col-span-2 text-center text-[10px] font-bold text-gray-500">{p.qty}</div>
                             <div className="col-span-4 text-right">
                                <span className={`text-[11px] font-black ${p.margin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                   S/ {p.margin.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                                </span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </section>

                <div className="p-6 bg-gray-50 rounded-sm border border-gray-200 flex items-start gap-4">
                   <Info size={24} className="text-odoo-primary shrink-0"/>
                   <p className="text-[11px] text-gray-600 leading-relaxed font-bold italic">
                     "Este informe cruza el precio de venta actual con el 'Costo Estándar' registrado en Odoo. Las utilidades son antes de gastos operativos fijos."
                   </p>
                </div>
             </div>

             <div className="p-8 border-t bg-gray-50 shadow-2xl">
                <button 
                  onClick={() => exportPosDetail(selectedPos.id)}
                  className="w-full bg-odoo-primary hover:bg-[#5a3c52] text-white py-5 rounded-sm font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <FileSpreadsheet size={22}/> Generar Reporte de Auditoría (XLSX)
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
