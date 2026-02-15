
import React from 'react';
import { Activity, Calendar, Wallet, Store, ShieldCheck, TrendingUp, DollarSign, PiggyBank } from 'lucide-react';
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

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <OdooStatCard title="Venta Bruta" value={`S/ ${totalSales.toLocaleString('es-PE')}`} icon={TrendingUp} active />
        <OdooStatCard title="Utilidad Bruta" value={`S/ ${totalMargin.toLocaleString('es-PE')}`} icon={PiggyBank} />
        <OdooStatCard title="Margen de Ganancia" value={`${marginPercent.toFixed(1)}%`} icon={DollarSign} />
        <OdooStatCard title="Turnos Activos" value={totalSessions} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lista de Boticas */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 bg-gray-50 border-b flex justify-between items-center">
             <div className="space-y-1">
               <h3 className="text-sm font-black text-gray-800 flex items-center gap-3 uppercase tracking-wider">
                 <Activity size={18} className="text-odoo-primary"/> Monitor Operativo SJS
               </h3>
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sincronización de cajas del día</p>
             </div>
             <div className="text-right">
                <span className="text-[10px] font-black text-odoo-primary bg-odoo-primary/5 px-3 py-1.5 rounded uppercase tracking-widest border border-odoo-primary/10">Sync: {lastSync}</span>
             </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto custom-scrollbar bg-white">
            {posConfigs.map(c => {
              const data = posSalesData[c.id];
              return (
                <div key={c.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all group">
                  <div className="flex items-center gap-5">
                    <div className={`w-3 h-3 rounded-full shadow-sm ${data?.isOnline ? 'bg-green-500 animate-pulse ring-4 ring-green-100' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className="text-[13px] font-black text-gray-800 uppercase group-hover:text-odoo-primary transition-colors tracking-tight">{c.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{data?.sessions?.length || 0} Sesiones</p>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <p className={`text-[9px] font-black uppercase tracking-widest ${data?.isOnline ? 'text-green-600' : 'text-gray-400'}`}>
                          {data?.rawState?.replace('_', ' ') || 'SIN ACTIVIDAD'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-base font-black text-gray-800">S/ {(data?.totalSales || 0).toLocaleString('es-PE', {minimumFractionDigits: 2})}</p>
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">
                       +{((data?.margin / (data?.totalSales || 1)) * 100).toFixed(1)}% RENTAB.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Certificación y Stats */}
        <div className="lg:col-span-5 space-y-8">
           <div className="bg-odoo-primary p-8 rounded-sm text-white shadow-xl relative overflow-hidden group">
              <div className="relative z-10 space-y-6">
                 <ShieldCheck size={50} className="text-white/30 group-hover:scale-110 transition-transform"/>
                 <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Integridad de Datos BI</h3>
                    <p className="text-[11px] text-white/70 font-bold leading-relaxed uppercase tracking-wider">
                       Cálculo de margen basado en (Venta - Costo Odoo). Reportes certificados para auditoría fiscal y operativa.
                    </p>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <div className="bg-white/10 px-4 py-3 rounded-sm backdrop-blur-md flex-1 text-center border border-white/5">
                       <p className="text-[9px] font-black text-white/50 uppercase mb-1">Empresa</p>
                       <p className="text-[11px] font-black">SAN JOSE SAC</p>
                    </div>
                    <div className="bg-white/10 px-4 py-3 rounded-sm backdrop-blur-md flex-1 text-center border border-white/5">
                       <p className="text-[9px] font-black text-white/50 uppercase mb-1">Motor</p>
                       <p className="text-[11px] font-black">ODOO V18 RPC</p>
                    </div>
                 </div>
              </div>
              <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
           </div>

           <div className="bg-white border border-gray-200 rounded-sm p-8 shadow-sm space-y-6">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] border-b pb-4">Eficiencia Financiera</h4>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[10px] font-black text-gray-500 uppercase">Margen de Operación</span>
                       <span className="text-sm font-black text-odoo-primary">{marginPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                       <div className="bg-odoo-primary h-full transition-all duration-1000" style={{ width: `${marginPercent}%` }}></div>
                    </div>
                 </div>
                 <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-sm border border-amber-100">
                    <Activity size={20} className="text-amber-500 shrink-0"/>
                    <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                       Atención: Los márgenes menores al 15% requieren revisión de precios o negociación con proveedores de laboratorio.
                    </p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
