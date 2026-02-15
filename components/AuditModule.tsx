
import React from 'react';
import { TrendingUp, FileSpreadsheet, Store, X, Package, ListChecks, Download, AlertCircle } from 'lucide-react';
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
        'Estado Odoo': d?.rawState || 'SIN INFO',
        'Venta Bruta (S/)': d?.totalSales || 0,
        'Costo de Mercancía (S/)': d?.totalCost || 0,
        'Utilidad Bruta (S/)': d?.margin || 0,
        'Rentabilidad %': d?.totalSales > 0 ? ((d.margin / d.totalSales) * 100).toFixed(2) + '%' : '0%',
        'Cant. Órdenes': d?.products?.reduce((a: any, b: any) => a + b.qty, 0) || 0
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(globalSummary), "Resumen BI");
    XLSX.writeFile(workbook, `Reporte_BI_SanJose_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Auditoria */}
      <div className="bg-white border border-gray-200 rounded-sm p-6 flex justify-between items-center shadow-sm">
        <div className="space-y-1">
          <h3 className="font-black text-gray-800 flex items-center gap-3 uppercase text-sm tracking-widest">
            <TrendingUp size={22} className="text-odoo-primary"/> Monitor de Rentabilidad SJS
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Datos calculados de ventas y costos unitarios reales</p>
        </div>
        <button 
          onClick={exportGlobalBIReport}
          className="bg-odoo-primary hover:bg-[#5a3c52] text-white px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3 transition-all shadow-md active:scale-95"
        >
          <Download size={18} /> Exportar Excel General
        </button>
      </div>
      
      {/* Grid de Boticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {posConfigs.length === 0 ? (
          <div className="col-span-full py-20 text-center space-y-4 bg-white border border-dashed rounded">
             <AlertCircle size={48} className="mx-auto text-gray-300"/>
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No se encontraron puntos de venta activos</p>
          </div>
        ) : posConfigs.map(c => {
          const data = posSalesData[c.id];
          const isOnline = data?.isOnline;
          return (
            <div 
              key={c.id} 
              onClick={() => onSelect(c)} 
              className={`bg-white border ${selectedPos?.id === c.id ? 'border-odoo-primary ring-2 ring-odoo-primary/10' : 'border-gray-200'} rounded-sm shadow-sm hover:shadow-lg transition-all cursor-pointer overflow-hidden border-b-4 ${isOnline ? 'border-b-green-500' : 'border-b-gray-300'}`}
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-lg ${isOnline ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'}`}>
                    <Store size={24}/>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${isOnline ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                    {data?.rawState || 'CARGANDO...'}
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-gray-800 uppercase text-sm truncate">{c.name}</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-tighter">Boticas San José S.A.C.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-gray-50 p-3 rounded border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Venta</p>
                    <p className="text-xs font-black text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 1})}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded border border-green-100">
                    <p className="text-[8px] font-black text-green-600 uppercase mb-1">Margen</p>
                    <p className="text-xs font-black text-green-700">S/ {(data?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 1})}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sidebar de Detalle */}
      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <div>
                   <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{selectedPos.name}</h3>
                   <p className="text-[9px] font-black text-odoo-primary uppercase tracking-widest mt-1">Análisis Detallado de Margen</p>
                </div>
                <button onClick={onCloseDetail} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
                  <X size={24}/>
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-5 bg-odoo-primary/5 border-l-4 border-odoo-primary rounded">
                      <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Venta del Día</p>
                      <p className="text-xl font-black text-odoo-primary">S/ {(posSalesData[selectedPos.id]?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="p-5 bg-green-50 border-l-4 border-green-500 rounded">
                      <p className="text-[9px] font-black text-green-600 uppercase mb-1">Utilidad (Margen)</p>
                      <p className="text-xl font-black text-green-700">S/ {(posSalesData[selectedPos.id]?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                </div>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                     <ListChecks size={16} className="text-odoo-primary"/> Métodos de Pago
                   </h4>
                   <div className="space-y-2">
                      {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([method, amount]: [any, any]) => (
                        <div key={method} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-100 rounded">
                           <span className="text-[10px] font-black text-gray-600 uppercase">{method}</span>
                           <span className="font-black text-gray-800">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                        </div>
                      ))}
                      {Object.keys(posSalesData[selectedPos.id]?.payments || {}).length === 0 && (
                        <p className="text-[10px] text-center text-gray-400 py-6 uppercase border border-dashed rounded">Sin movimientos de pago</p>
                      )}
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2">
                     <Package size={16} className="text-odoo-primary"/> Rentabilidad por Producto
                   </h4>
                   <div className="bg-white border rounded shadow-sm overflow-hidden">
                      <div className="divide-y divide-gray-50">
                        {(posSalesData[selectedPos.id]?.products || []).slice(0, 30).map((p: any, idx: number) => (
                          <div key={idx} className="p-4 grid grid-cols-12 items-center hover:bg-gray-50 transition-all">
                             <div className="col-span-8">
                                <p className="text-[10px] font-black text-gray-700 uppercase truncate">{p.name}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase">
                                  {p.qty} UND | Costo Odoo: S/ {(p.cost / (p.qty || 1)).toFixed(2)}
                                </p>
                             </div>
                             <div className="col-span-4 text-right">
                                <span className={`text-[10px] font-black ${p.margin > 0 ? 'text-green-600' : 'text-red-500'}`}>
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
                <button className="w-full bg-odoo-primary hover:bg-[#5a3c52] text-white py-4 rounded font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg">
                  <FileSpreadsheet size={18}/> Descargar PDF de Auditoría
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
