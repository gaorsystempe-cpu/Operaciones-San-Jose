
import React, { useMemo } from 'react';
import { Activity, Calendar, Wallet, Store, ShieldCheck, TrendingUp, DollarSign, PiggyBank, Package, Trophy, Star, ChevronRight } from 'lucide-react';
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
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OdooStatCard title="Ventas Totales" value={`S/ ${totalSales.toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={TrendingUp} active />
        <OdooStatCard title="Utilidad Bruta" value={`S/ ${totalMargin.toLocaleString('es-PE', {minimumFractionDigits: 2})}`} icon={PiggyBank} />
        <OdooStatCard title="Rendimiento" value={`${marginPercent.toFixed(1)}%`} icon={Activity} />
        <OdooStatCard title="Pedidos Hoy" value={totalSessions} icon={Package} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rendimiento Sedes Table-like */}
        <div className="lg:col-span-8 bg-white border border-odoo-border rounded-odoo overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 border-b border-odoo-border flex justify-between items-center bg-gray-50/50">
             <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-tight">
               <Store size={16} className="text-odoo-primary"/> Resumen por Botica
             </h3>
             <span className="text-[10px] font-bold text-gray-400 bg-white px-2 py-1 rounded border border-odoo-border">Última actualización: {lastSync}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-odoo-border">
                <tr>
                  <th className="px-6 py-3">Sede</th>
                  <th className="px-6 py-3">Estado</th>
                  <th className="px-6 py-3 text-right">Venta Bruta</th>
                  <th className="px-6 py-3 text-right">Margen %</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posConfigs.map(c => {
                  const data = posSalesData[c.id];
                  const margin = data?.totalSales > 0 ? ((data.margin / data.totalSales) * 100) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-gray-700 uppercase">{c.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${data?.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                           <span className="text-[11px] font-semibold text-gray-500 uppercase">{data?.rawState || 'S/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-bold text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`text-xs font-bold ${margin > 20 ? 'text-green-600' : 'text-amber-600'}`}>
                          {margin.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <ChevronRight size={14} className="text-gray-300 group-hover:text-odoo-primary transition-colors inline" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Card */}
        <div className="lg:col-span-4 bg-white border border-odoo-border rounded-odoo shadow-sm flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-odoo-border bg-odoo-primary text-white flex items-center justify-between">
             <h3 className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
               <Trophy size={16} /> Top 15 Productos
             </h3>
             <Star size={14} className="text-amber-300" />
          </div>
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
             {topProducts.length === 0 ? (
                <div className="p-16 text-center">
                   <Package size={32} className="text-gray-200 mx-auto mb-2"/>
                   <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Sin ventas registradas</p>
                </div>
             ) : topProducts.map((p, idx) => (
               <div key={idx} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                     #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                     <p className="text-xs font-bold text-gray-700 uppercase truncate">{p.name}</p>
                     <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                        {p.qty} Unidades · S/ {p.total.toLocaleString('es-PE', {minimumFractionDigits: 2})}
                     </p>
                  </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};
