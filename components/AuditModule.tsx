
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
  
  const exportGlobalBIReport = () => {
    const workbook = XLSX.utils.book_new();
    
    // Hoja 1: Resumen Financiero por Botica
    const globalSummary = posConfigs.map(c => {
      const d = posSalesData[c.id];
      const marginRaw = d?.margin || 0;
      const salesRaw = d?.totalSales || 1; // Prevenir división por cero
      return {
        'Botica': c.name || 'S/N',
        'Estado Odoo': (d?.rawState || 'N/A').toUpperCase(),
        'Venta Total (S/)': d?.totalSales || 0,
        'Costo de Ventas (S/)': d?.totalCost || 0,
        'Utilidad Bruta (S/)': marginRaw,
        'Margen %': ((marginRaw / (d?.totalSales || 1)) * 100).toFixed(2) + '%',
        'Sesiones Hoy': d?.count || 0
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(globalSummary), "Resumen Financiero");

    // Hoja 2: Top Productos Consolidados (Toda la Empresa)
    const allProducts: Record<string, any> = {};
    Object.values(posSalesData).forEach((data: any) => {
      if (!data?.products) return;
      data.products.forEach((p: any) => {
        if (!allProducts[p.name]) allProducts[p.name] = { qty: 0, total: 0, cost: 0, margin: 0 };
        allProducts[p.name].qty += (p.qty || 0);
        allProducts[p.name].total += (p.total || 0);
        allProducts[p.name].cost += (p.cost || 0);
        allProducts[p.name].margin += (p.margin || 0);
      });
    });
    
    const productData = Object.entries(allProducts).map(([name, d]) => ({ 
      'Producto': name, 
      'Und Vendidas': d.qty, 
      'Venta Total': d.total, 
      'Costo Total': d.cost, 
      'Margen Total': d.margin 
    })).sort((a, b) => b['Venta Total'] - a['Venta Total']);
    
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productData), "Ranking Productos Global");

    XLSX.writeFile(workbook, `BI_SanJose_Global_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPosDetail = (posId: number) => {
    const data = posSalesData[posId];
    if (!data) return;

    const workbook = XLSX.utils.book_new();
    
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((data.sessions || []).map((s: any) => ({
      'ID': s.id, 'Cajero': s.user_id ? s.user_id[1] : 'N/A', 'Inicio': s.start_at, 'Estado': s.state, 'Total': s.total_payments_amount
    }))), "Sesiones");

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet((data.products || []).map((p: any) => ({
      'Producto': p.name, 'Cant': p.qty, 'Venta': p.total, 'Costo': p.cost, 'Utilidad': p.margin
    }))), "Productos");

    XLSX.writeFile(workbook, `Detalle_POS_${posConfigs.find(c => c.id === posId)?.name.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
      <div className="bg-white border border-gray-200 rounded-sm p-6 flex justify-between items-center shadow-sm">
        <div className="space-y-1">
          <h3 className="font-black text-gray-800 flex items-center gap-3 uppercase text-sm tracking-widest">
            <TrendingUp size={22} className="text-odoo-primary"/> Control de Auditoría SJS
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Supervisión en tiempo real de márgenes y ventas</p>
        </div>
        <button 
          onClick={exportGlobalBIReport}
          className="bg-odoo-primary hover:bg-[#5a3c52] text-white px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3 transition-all shadow-lg active:scale-95"
        >
          <Download size={18} /> Exportar Consolidado Global (BI)
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {posConfigs.map(c => {
          const data = posSalesData[c.id];
          return (
            <div 
              key={c.id} 
              onClick={() => onSelect(c)} 
              className="bg-white border border-gray-200 rounded-sm shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer overflow-hidden group border-b-4 border-b-gray-200 hover:border-b-odoo-primary"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className={`w-14 h-14 rounded-lg flex items-center justify-center transition-all shadow-inner ${data?.isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-300 group-hover:text-odoo-primary'}`}>
                    <Store size={28}/>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase mb-1 shadow-sm ${data?.isOnline ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-200 text-gray-500'}`}>
                      {data?.rawState || 'SIN INFO'}
                    </span>
                    <span className="text-[8px] font-black text-gray-400 tracking-widest uppercase">{data?.count || 0} Sesiones</span>
                  </div>
                </div>
                <h4 className="font-black text-gray-800 uppercase text-base mb-1 truncate tracking-tight">{c.name}</h4>
                <p className="text-[10px] text-gray-400 font-black mb-8 border-l-2 border-odoo-primary pl-2 uppercase tracking-widest">SJS Botica S.A.C.</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-sm border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Venta Bruta</p>
                    <p className="text-sm font-black text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE')}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-sm border border-green-100">
                    <p className="text-[8px] font-black text-green-600 uppercase tracking-widest mb-1">Margen Hoy</p>
                    <p className="text-sm font-black text-green-700">S/ {(data?.margin || 0).toLocaleString('es-PE')}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
             <div className="p-8 border-b flex justify-between items-center bg-gray-50 shadow-sm">
                <div>
                   <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">{selectedPos.name}</h3>
                   <p className="text-[10px] font-black text-odoo-primary uppercase tracking-[0.3em] mt-2 border-l-4 border-odoo-primary pl-3">BI Intelligence - Detalle Sede</p>
                </div>
                <button onClick={onCloseDetail} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-full transition-all group"><X size={30} className="group-hover:rotate-90 transition-transform"/></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-white">
                <section className="grid grid-cols-2 gap-6">
                   <div className="p-6 bg-odoo-primary/5 border-l-4 border-odoo-primary rounded-r-lg">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Ingresos Totales</p>
                      <p className="text-2xl font-black text-odoo-primary tracking-tighter">S/ {(posSalesData[selectedPos.id]?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="p-6 bg-green-50 border-l-4 border-green-500 rounded-r-lg">
                      <p className="text-[10px] font-black text-green-600 uppercase mb-2">Margen Neto Estimado</p>
                      <p className="text-2xl font-black text-green-700 tracking-tighter">S/ {(posSalesData[selectedPos.id]?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] border-b-2 border-gray-100 pb-3 flex items-center gap-3">
                     <ListChecks size={18} className="text-odoo-primary"/> Recaudación por Métodos
                   </h4>
                   <div className="grid grid-cols-1 gap-3">
                      {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([method, amount]: [any, any]) => (
                        <div key={method} className="p-5 bg-white border border-gray-100 rounded-sm shadow-sm flex justify-between items-center hover:border-odoo-primary transition-colors">
                           <span className="text-[11px] font-black text-gray-500 uppercase">{method}</span>
                           <span className="text-base font-black text-gray-800">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                        </div>
                      ))}
                      {Object.keys(posSalesData[selectedPos.id]?.payments || {}).length === 0 && (
                        <p className="text-[10px] font-black text-gray-400 uppercase italic text-center py-4 bg-gray-50 rounded border border-dashed">No se registran pagos en el periodo</p>
                      )}
                   </div>
                </section>

                <section className="space-y-4">
                   <div className="flex justify-between items-center border-b-2 border-gray-100 pb-3">
                      <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.3em] flex items-center gap-3">
                        <Package size={18} className="text-odoo-primary"/> Análisis SKU (Rentabilidad)
                      </h4>
                      <span className="text-[9px] font-black text-odoo-primary bg-odoo-primary/10 px-2 py-0.5 rounded uppercase">TOP 15</span>
                   </div>
                   <div className="bg-white border rounded-sm shadow-sm overflow-hidden">
                      <div className="grid grid-cols-12 bg-gray-50 p-3 text-[9px] font-black text-gray-400 uppercase tracking-wider border-b">
                         <div className="col-span-8">Producto</div>
                         <div className="col-span-4 text-right">Margen (S/)</div>
                      </div>
                      <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {(posSalesData[selectedPos.id]?.products || []).slice(0, 15).map((p: any, idx: number) => (
                          <div key={idx} className="grid grid-cols-12 p-4 items-center hover:bg-gray-50 transition-colors">
                             <div className="col-span-8">
                                <p className="text-[10px] font-black text-gray-700 uppercase truncate">{p.name || 'S/N'}</p>
                                <p className="text-[8px] font-bold text-gray-400">VENDIDO: {p.qty || 0} UND</p>
                             </div>
                             <div className="col-span-4 text-right">
                                <span className="text-[11px] font-black text-green-600">
                                   S/ {(p.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                                </span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </section>
             </div>

             <div className="p-8 border-t bg-gray-50 shadow-2xl">
                <button 
                  onClick={() => exportPosDetail(selectedPos.id)}
                  className="w-full bg-odoo-primary hover:bg-[#5a3c52] text-white py-5 rounded-sm font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <FileSpreadsheet size={22}/> Descargar Reporte de Sede (XLSX)
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
