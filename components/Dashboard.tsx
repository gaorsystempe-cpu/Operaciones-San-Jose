
import React, { useMemo } from 'react';
import { Activity, Calendar, Wallet, Store, ShieldCheck, TrendingUp, DollarSign, PiggyBank, Package, Trophy, Star } from 'lucide-react';
import { OdooStatCard } from './StatCard';

interface DashboardProps {
  posConfigs: any[];
  posSalesData: any;
  lastSync: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ posConfigs, posSalesData, lastSync }) => {
  const totalSales = Number(Object.values(posSalesData).reduce((a: any, b: any) => a + (b.totalSales || 0), 0));
  const totalMargin = Number(Object.values(posSalesData).reduce((a: any, b: any) => a + (b.margin || 0), 0));
  const totalSessions = Object.values(posSalesData).reduce((a: any, b: any) => a + (b.count || 0), 0);
  
  const marginPercent = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0;

  // Cálculo de productos más vendidos globalmente
  const topProducts = useMemo(() => {
    const agg: Record<string, { qty: number, total: number }> = {};
    Object.values(posSalesData).forEach((pos: any) => {
      (pos.products || []).forEach((p: any) => {
        if (!agg[p.name]) agg[p.name] = { qty: 0, total: 0 };
        agg[p.name].qty += p.qty;
        agg[p.name].total += p.total;
      });
    });
    return Object.entries(agg)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 15);
  }, [posSalesData]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <OdooStatCard title="Venta Bruta" value={`S/ ${totalSales.toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={TrendingUp} active />
        <OdooStatCard title="Utilidad Bruta" value={`S/ ${totalMargin.toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={PiggyBank} />
        <OdooStatCard title="Margen Global" value={`${marginPercent.toFixed(1)}%`} icon={DollarSign} />
        <OdooStatCard title="Cajas Activas" value={totalSessions} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Monitor de Sedes */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
             <div className="space-y-1">
               <h3 className="text-sm font-black text-gray-800 flex items-center gap-3 uppercase tracking-wider">
                 <Activity size={18} className="text-odoo-primary"/> Rendimiento por Botica
               </h3>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Estado actual de ventas</p>
             </div>
             <div className="text-right">
                <span className="text-[10px] font-black text-odoo-primary bg-odoo-primary/5 px-3 py-1.5 rounded-full uppercase tracking-widest">Hoy: {lastSync}</span>
             </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar bg-white">
            {posConfigs.map(c => {
              const data = posSalesData[c.id];
              return (
                <div key={c.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all group">
                  <div className="flex items-center gap-5">
                    <div className={`w-3 h-3 rounded-full ${data?.isOnline ? 'bg-green-500 animate-pulse ring-4 ring-green-100' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className="text-[13px] font-black text-gray-800 uppercase tracking-tight group-hover:text-odoo-primary transition-colors">{c.name}</p>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">
                        {data?.rawState || 'SIN ACTIVIDAD'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                    <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mt-0.5">
                       Rentab: {((data?.margin / (data?.totalSales || 1)) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Productos Más Vendidos */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 bg-odoo-primary text-white border-b flex items-center gap-4">
             <div className="p-3 bg-white/20 rounded-lg">
                <Trophy size={24} className="text-amber-300"/>
             </div>
             <div>
                <h3 className="text-sm font-black uppercase tracking-widest">Top Productos del Día</h3>
                <p className="text-[9px] text-white/60 font-bold uppercase tracking-widest">Lo más vendido en San José</p>
             </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto custom-scrollbar">
             {topProducts.length === 0 ? (
                <div className="p-24 text-center opacity-30 flex flex-col items-center gap-4">
                   <Package size={48} className="text-gray-400"/>
                   <p className="text-[10px] font-black uppercase tracking-widest">Esperando ventas del día...</p>
                </div>
             ) : topProducts.map((p, idx) => (
               <div key={idx} className="p-5 flex items-center gap-5 hover:bg-gray-50 transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[12px] font-black text-gray-400 group-hover:bg-odoo-primary group-hover:text-white transition-all shadow-sm border border-gray-100">
                     {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-[11px] font-black text-gray-800 uppercase truncate tracking-tight">{p.name}</p>
                     <div className="flex items-center gap-4 mt-1">
                        <span className="flex items-center gap-1.5 text-[9px] font-black text-odoo-primary uppercase bg-odoo-primary/5 px-2 py-0.5 rounded-full">
                           <Star size={10} className="fill-odoo-primary"/> {p.qty} UND
                        </span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase">
                           Total: S/ {p.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                        </span>
                     </div>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
