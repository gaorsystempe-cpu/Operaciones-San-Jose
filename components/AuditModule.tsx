
import React from 'react';
import { TrendingUp, FileSpreadsheet, Store, X, Package, ListChecks, Download, AlertCircle, Info } from 'lucide-react';
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-white border border-gray-200 rounded p-6 flex justify-between items-center shadow-sm">
        <div className="space-y-1">
          <h3 className="font-black text-gray-800 flex items-center gap-3 uppercase text-sm tracking-widest">
            <TrendingUp size={22} className="text-odoo-primary"/> Monitor de Rentabilidad
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Análisis Operativo San José - Datos Consolidados</p>
        </div>
        <button 
          onClick={exportGlobalBIReport}
          className="bg-odoo-primary hover:bg-[#5a3c52] text-white px-6 py-3 rounded text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95 flex items-center gap-2"
        >
          <Download size={16} /> Excel Consolidado
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posConfigs.map(c => {
          const data = posSalesData[c.id];
          const isOnline = data?.isOnline;
          const hasZeroCosts = data?.totalSales > 0 && data?.totalCost === 0;

          return (
            <div 
              key={c.id} 
              onClick={() => onSelect(c)} 
              className={`bg-white border ${selectedPos?.id === c.id ? 'border-odoo-primary ring-2 ring-odoo-primary/10' : 'border-gray-200'} rounded shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden border-b-4 ${isOnline ? 'border-b-green-500' : 'border-b-gray-300'}`}
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-lg ${isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Store size={22}/>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${isOnline ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                    {data?.rawState || 'S/A'}
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-gray-800 uppercase text-xs truncate tracking-tight">{c.name}</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">Sede Boticas San José</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="bg-gray-50 p-3 rounded border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Ventas</p>
                    <p className="text-xs font-black text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                  </div>
                  <div className={`p-3 rounded border ${hasZeroCosts ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                    <p className={`text-[8px] font-black uppercase mb-1 ${hasZeroCosts ? 'text-amber-600' : 'text-green-600'}`}>Margen</p>
                    <p className={`text-xs font-black ${hasZeroCosts ? 'text-amber-700' : 'text-green-700'}`}>S/ {(data?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-odoo-primary rounded flex items-center justify-center text-white">
                      <Store size={20}/>
                   </div>
                   <div>
                      <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">{selectedPos.name}</h3>
                      <p className="text-[9px] font-black text-odoo-primary uppercase mt-1">Detalle de Operaciones</p>
                   </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onCloseDetail(); }} 
                  className="p-3 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all border border-transparent"
                >
                  <X size={24}/>
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <div className="grid grid-cols-3 gap-3">
                   <div className="p-4 bg-white border rounded shadow-sm text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Ingreso</p>
                      <p className="text-sm font-black text-gray-800">S/ {(posSalesData[selectedPos.id]?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="p-4 bg-white border rounded shadow-sm text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase mb-1 tracking-widest">Costo</p>
                      <p className="text-sm font-black text-red-600">S/ {(posSalesData[selectedPos.id]?.totalCost || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="p-4 bg-green-50 border border-green-100 rounded text-center">
                      <p className="text-[9px] font-black text-green-600 uppercase mb-1 tracking-widest">Utilidad</p>
                      <p className="text-sm font-black text-green-700">S/ {(posSalesData[selectedPos.id]?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                </div>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                     <ListChecks size={16} className="text-odoo-primary"/> Medios de Pago
                   </h4>
                   <div className="space-y-2">
                      {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([method, amount]: [any, any]) => (
                        <div key={method} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded">
                           <span className="text-[10px] font-black text-gray-600 uppercase tracking-tight">{method}</span>
                           <span className="text-sm font-black text-gray-800">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                        </div>
                      ))}
                      {Object.keys(posSalesData[selectedPos.id]?.payments || {}).length === 0 && (
                        <p className="text-[10px] text-center text-gray-400 py-4 uppercase border border-dashed rounded">Sin pagos registrados hoy</p>
                      )}
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                     <Package size={16} className="text-odoo-primary"/> Margen por Producto
                   </h4>
                   <div className="bg-white border rounded shadow-sm overflow-hidden">
                      <div className="divide-y divide-gray-100">
                        {(posSalesData[selectedPos.id]?.products || []).length === 0 ? (
                           <p className="p-10 text-center text-[10px] font-black text-gray-400 uppercase">Sin productos vendidos</p>
                        ) : (posSalesData[selectedPos.id]?.products || []).slice(0, 50).map((p: any, idx: number) => (
                          <div key={idx} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-all">
                             <div className="max-w-[70%]">
                                <p className="text-[10px] font-black text-gray-700 uppercase truncate tracking-tight">{p.name}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">{p.qty} Unid | Costo: S/ {(p.cost / (p.qty || 1)).toFixed(2)}</p>
                             </div>
                             <div className="text-right">
                                <span className={`text-[11px] font-black ${p.margin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                   S/ {(p.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                                </span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                </section>
             </div>

             <div className="p-6 border-t bg-gray-50">
                <button 
                  onClick={() => alert("Generando reporte...")}
                  className="w-full bg-odoo-primary hover:bg-[#5a3c52] text-white py-4 rounded font-black text-[10px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-3 transition-all"
                >
                  <FileSpreadsheet size={18}/> Descargar Reporte de Sede
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
