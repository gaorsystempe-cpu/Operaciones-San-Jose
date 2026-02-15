
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
        'Estado Odoo': d?.rawState || 'SIN INFO',
        'Venta Bruta (S/)': d?.totalSales || 0,
        'Costo Mercancía (S/)': d?.totalCost || 0,
        'Utilidad Bruta (S/)': d?.margin || 0,
        'Rentabilidad %': d?.totalSales > 0 ? ((d.margin / d.totalSales) * 100).toFixed(2) + '%' : '0%',
      };
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(globalSummary), "Resumen San Jose");
    XLSX.writeFile(workbook, `Auditoria_SanJose_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white border border-gray-200 rounded-sm p-6 flex justify-between items-center shadow-sm">
        <div className="space-y-1">
          <h3 className="font-black text-gray-800 flex items-center gap-3 uppercase text-sm tracking-widest">
            <TrendingUp size={22} className="text-odoo-primary"/> Monitor de Rentabilidad SJS
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Márgenes calculados: (Venta Bruta - Costos Odoo)</p>
        </div>
        <button 
          onClick={exportGlobalBIReport}
          className="bg-odoo-primary hover:bg-[#5a3c52] text-white px-6 py-3 rounded-sm text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-3 transition-all shadow-md active:scale-95"
        >
          <Download size={18} /> Descargar Reporte Completo
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {posConfigs.map(c => {
          const data = posSalesData[c.id];
          const isOnline = data?.isOnline;
          const hasZeroCosts = data?.totalSales > 0 && data?.totalCost === 0;

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
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${isOnline ? 'bg-green-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                      {data?.rawState || 'Cargando...'}
                    </span>
                    {hasZeroCosts && (
                      <span className="flex items-center gap-1 text-[7px] font-black text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 animate-bounce">
                        <AlertCircle size={8}/> Sin Costos Odoo
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-black text-gray-800 uppercase text-sm truncate tracking-tight">{c.name}</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Sede San José S.A.C.</p>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-gray-50 p-3 rounded border border-gray-100">
                    <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Venta Total</p>
                    <p className="text-xs font-black text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 1})}</p>
                  </div>
                  <div className={`p-3 rounded border ${hasZeroCosts ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                    <p className={`text-[8px] font-black uppercase mb-1 ${hasZeroCosts ? 'text-amber-600' : 'text-green-600'}`}>Utilidad Bruta</p>
                    <p className={`text-xs font-black ${hasZeroCosts ? 'text-amber-700' : 'text-green-700'}`}>S/ {(data?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 1})}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPos && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCloseDetail}></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-odoo-primary rounded-lg flex items-center justify-center text-white shadow-inner">
                      <Store size={24}/>
                   </div>
                   <div>
                      <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">{selectedPos.name}</h3>
                      <p className="text-[9px] font-black text-odoo-primary uppercase tracking-[0.2em] mt-1">BI Intelligence San José</p>
                   </div>
                </div>
                <button onClick={onCloseDetail} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all border border-transparent hover:border-red-100">
                  <X size={28}/>
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                <div className="grid grid-cols-3 gap-4">
                   <div className="p-4 bg-gray-50 border rounded text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Venta Bruta</p>
                      <p className="text-sm font-black text-gray-800">S/ {(posSalesData[selectedPos.id]?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="p-4 bg-gray-50 border rounded text-center">
                      <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Costo Odoo</p>
                      <p className="text-sm font-black text-red-600">S/ {(posSalesData[selectedPos.id]?.totalCost || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                   <div className="p-4 bg-green-50 border border-green-100 rounded text-center">
                      <p className="text-[9px] font-black text-green-600 uppercase mb-1">Utilidad</p>
                      <p className="text-sm font-black text-green-700">S/ {(posSalesData[selectedPos.id]?.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                   </div>
                </div>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b pb-2 flex items-center gap-2">
                     <ListChecks size={16} className="text-odoo-primary"/> Recaudación por Medio
                   </h4>
                   <div className="grid grid-cols-1 gap-2">
                      {Object.entries(posSalesData[selectedPos.id]?.payments || {}).map(([method, amount]: [any, any]) => (
                        <div key={method} className="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-sm shadow-sm">
                           <span className="text-[11px] font-black text-gray-500 uppercase">{method}</span>
                           <span className="text-base font-black text-gray-800">S/ {amount.toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                        </div>
                      ))}
                   </div>
                </section>

                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] border-b pb-2 flex items-center gap-2">
                     <Package size={16} className="text-odoo-primary"/> Rentabilidad por SKU
                   </h4>
                   <div className="bg-white border rounded shadow-sm overflow-hidden">
                      <div className="divide-y divide-gray-50">
                        {(posSalesData[selectedPos.id]?.products || []).slice(0, 40).map((p: any, idx: number) => (
                          <div key={idx} className="p-4 grid grid-cols-12 items-center hover:bg-gray-50 transition-all">
                             <div className="col-span-8">
                                <p className="text-[10px] font-black text-gray-700 uppercase truncate">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[8px] font-bold text-gray-400 uppercase">{p.qty} UND</p>
                                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                  <p className="text-[8px] font-bold text-gray-400 uppercase">Costo Odoo: S/ {(p.cost / (p.qty || 1)).toFixed(2)}</p>
                                </div>
                             </div>
                             <div className="col-span-4 text-right">
                                <span className={`text-[11px] font-black ${p.margin > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                   S/ {(p.margin || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}
                                </span>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>
                   {posSalesData[selectedPos.id]?.totalCost === 0 && posSalesData[selectedPos.id]?.totalSales > 0 && (
                     <div className="flex items-start gap-3 p-4 bg-amber-50 rounded border border-amber-200">
                       <Info size={20} className="text-amber-500 shrink-0"/>
                       <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                         Alerta: No se detectaron costos registrados para estos productos en Principal 1 de Odoo. 
                         El margen mostrado es del 100% debido a falta de data maestra de costos.
                       </p>
                     </div>
                   )}
                </section>
             </div>

             <div className="p-6 border-t bg-gray-50">
                <button 
                  onClick={() => alert("Generando reporte PDF...")}
                  className="w-full bg-odoo-primary hover:bg-[#5a3c52] text-white py-5 rounded font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
                >
                  <FileSpreadsheet size={20}/> Descargar Auditoría de Sede
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
