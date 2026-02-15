
import React from 'react';
import { TrendingUp, FileSpreadsheet, Store, X, Package, ListChecks, Download, AlertCircle, Info, ChevronRight, Calculator, DollarSign } from 'lucide-react';
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
    const globalSummary = posConfigs.map(c => {
      const d = posSalesData[c.id];
      return {
        'Botica': c.name || 'S/N',
        'Estado': d?.rawState || 'S/A',
        'Venta Bruta (S/)': d?.totalSales || 0,
        'Costo (S/)': d?.totalCost || 0,
        'Utilidad (S/)': d?.margin || 0,
        'Margen %': d?.totalSales > 0 ? ((d.margin / d.totalSales) * 100).toFixed(2) + '%' : '0%',
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(globalSummary), "Reporte_Auditoria");
    XLSX.writeFile(workbook, `Reporte_SanJose_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const currentData = selectedPos ? posSalesData[selectedPos.id] : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-20 animate-fade">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 border border-odoo-border rounded shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-700 uppercase">Monitor de Auditoría</h2>
          <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-widest">Análisis Operativo Consolidado</p>
        </div>
        <button 
          onClick={exportGlobalBIReport}
          className="o-btn o-btn-primary gap-2"
        >
          <Download size={16} /> Descargar Excel Consolidado
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posConfigs.map(c => {
          const data = posSalesData[c.id];
          const isOnline = data?.isOnline;

          return (
            <div 
              key={c.id} 
              onClick={() => onSelect(c)} 
              className={`bg-white border ${selectedPos?.id === c.id ? 'border-odoo-primary ring-2 ring-odoo-primary/10' : 'border-odoo-border'} rounded shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden group`}
            >
              <div className="p-5 flex items-center justify-between border-b border-gray-50">
                 <div className="flex items-center gap-3">
                   <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                   <h4 className="font-bold text-gray-700 uppercase text-xs tracking-tight group-hover:text-odoo-primary transition-colors">{c.name}</h4>
                 </div>
                 <ChevronRight size={14} className="text-gray-300 group-hover:text-odoo-primary transition-all" />
              </div>
              <div className="p-5 grid grid-cols-2 gap-4 bg-gray-50/10">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Venta Hoy</p>
                    <p className="text-base font-bold text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Margen Estimado</p>
                    <p className="text-base font-bold text-odoo-primary">S/ {(data?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                  </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-2xl bg-[#f8f9fa] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="px-6 py-4 border-b bg-white flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-odoo-primary text-white rounded-lg shadow-md">
                      <Store size={22}/>
                   </div>
                   <div>
                     <h3 className="text-lg font-bold text-gray-700 uppercase leading-none">{selectedPos.name}</h3>
                     <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-widest">Detalle Analítico de Operaciones</p>
                   </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onCloseDetail(); }} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-odoo-primary"
                >
                  <X size={24}/>
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <div className="grid grid-cols-3 gap-4">
                   <div className="p-5 bg-white border border-odoo-border rounded shadow-sm hover:border-odoo-primary/20 transition-colors">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-1.5"><TrendingUp size={12}/> Venta Bruta</p>
                      <p className="text-xl font-bold text-gray-800">S/ {(currentData?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="p-5 bg-white border border-odoo-border rounded shadow-sm">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2 flex items-center gap-1.5"><Calculator size={12}/> Costo Total</p>
                      <p className="text-xl font-bold text-red-500">S/ {(currentData?.totalCost || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="p-5 bg-white border border-odoo-primary/30 rounded shadow-md ring-1 ring-odoo-primary/10">
                      <p className="text-[10px] font-black text-odoo-primary uppercase mb-2 flex items-center gap-1.5"><DollarSign size={12}/> Utilidad</p>
                      <p className="text-xl font-bold text-odoo-primary">S/ {(currentData?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                </div>

                <div className="bg-white border border-odoo-border rounded overflow-hidden shadow-sm">
                   <div className="px-5 py-3 border-b bg-gray-50/50">
                      <h4 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                        <ListChecks size={16} className="text-odoo-primary" /> Medios de Pago (Cierre Parcial)
                      </h4>
                   </div>
                   <div className="divide-y divide-gray-100">
                      {Object.entries(currentData?.payments || {}).length === 0 ? (
                        <div className="p-8 text-center text-gray-400 italic text-xs">No se han registrado pagos aún</div>
                      ) : Object.entries(currentData?.payments || {}).map(([method, amount]: [any, any]) => (
                        <div key={method} className="px-5 py-3.5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                           <span className="text-xs font-semibold text-gray-500 uppercase tracking-tight">{method}</span>
                           <span className="text-sm font-bold text-gray-800">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-white border border-odoo-border rounded overflow-hidden shadow-sm">
                   <div className="px-5 py-3 border-b bg-gray-50/50 flex justify-between items-center">
                      <h4 className="text-xs font-bold text-gray-600 uppercase flex items-center gap-2">
                        <Package size={16} className="text-odoo-primary" /> Margen por Producto
                      </h4>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Orden: Mayor Venta</span>
                   </div>
                   <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {(currentData?.products || []).length === 0 ? (
                           <div className="p-12 text-center text-gray-400 italic text-xs flex flex-col items-center gap-3">
                              <Package size={32} className="opacity-20"/>
                              Sin productos vendidos en el rango
                           </div>
                        ) : (currentData?.products || []).map((p: any, idx: number) => {
                          const marginPct = p.total > 0 ? (p.margin / p.total) * 100 : 0;
                          return (
                            <div key={idx} className="px-5 py-3.5 flex justify-between items-center hover:bg-gray-50 transition-colors">
                               <div className="max-w-[65%] space-y-1">
                                  <p className="text-xs font-bold text-gray-700 uppercase truncate leading-tight">{p.name}</p>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{p.qty} UND</span>
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${marginPct > 15 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                       Margen: {marginPct.toFixed(1)}%
                                    </span>
                                  </div>
                               </div>
                               <div className="text-right">
                                  <p className="text-[9px] text-gray-400 font-bold uppercase">Utilidad</p>
                                  <span className={`text-sm font-bold ${p.margin > 0 ? 'text-odoo-primary' : 'text-red-500'}`}>
                                     S/ {(p.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                                  </span>
                               </div>
                            </div>
                          );
                        })}
                   </div>
                </div>
             </div>

             <div className="p-6 bg-white border-t border-odoo-border shadow-2xl">
                <button 
                  onClick={() => alert("Generando reporte Excel BI...")}
                  className="w-full o-btn o-btn-primary py-4 font-bold gap-3 shadow-lg"
                >
                  <FileSpreadsheet size={20}/> Descargar Reporte de Sede
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
