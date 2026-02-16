
import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MapPin, Clock, Plus, 
  Briefcase, Mail, X, RefreshCw, Coffee,
  ChevronRight, CalendarDays, Check, LayoutGrid, ArrowRight
} from 'lucide-react';
import { Employee, PosConfig, Shift } from '../types';
import { shiftService } from '../services/supabaseService';

interface StaffManagementProps {
  isAdmin: boolean;
  employees: Employee[];
  posConfigs: PosConfig[];
  currentUserEmail?: string;
  loading: boolean;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ 
  isAdmin, employees, posConfigs, currentUserEmail, loading: odooLoading 
}) => {
  const [activeView, setActiveView] = useState<'roster' | 'schedule'>('schedule');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [shiftType, setShiftType] = useState<'mañana' | 'tarde' | 'completo' | 'noche' | 'descanso'>('mañana');

  const loadShifts = async () => {
    setDbLoading(true);
    try {
      let data;
      if (isAdmin) {
        data = await shiftService.getShifts();
      } else if (currentUserEmail) {
        data = await shiftService.getMyShifts(currentUserEmail);
      }
      setShifts(data || []);
    } catch (e) {
      console.error("Error cargando turnos:", e);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [isAdmin, currentUserEmail]);

  const handleAddShiftRange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDbLoading(true);
    const formData = new FormData(e.currentTarget);
    const empId = Number(formData.get('employee_id'));
    const posId = Number(formData.get('pos_id'));
    const startDateStr = formData.get('start_date') as string;
    const endDateStr = formData.get('end_date') as string;
    
    const emp = employees.find(e => e.id === empId);
    const pos = posConfigs.find(p => p.id === posId);
    const isDescanso = shiftType === 'descanso';

    // Lógica para generar rango de fechas
    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    const shiftBatch: any[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      shiftBatch.push({
        employee_id: empId,
        employee_name: emp?.name || 'Desconocido',
        employee_email: emp?.work_email || '',
        pos_id: posId,
        pos_name: isDescanso ? 'LIBRE' : (pos?.name || 'Sin Sede'),
        date: d.toISOString().split('T')[0],
        shift_type: shiftType,
        start_time: isDescanso ? '00:00' : formData.get('start'),
        end_time: isDescanso ? '00:00' : formData.get('end'),
        status: 'confirmed',
        created_by: currentUserEmail
      });
    }

    try {
      await shiftService.createShifts(shiftBatch);
      setShowAddShift(false);
      loadShifts();
    } catch (e) {
      alert("Error al guardar rango: " + (e as any).message);
    } finally {
      setDbLoading(false);
    }
  };

  const deleteShift = async (id: string) => {
    if (!confirm("¿Eliminar esta asignación?")) return;
    setDbLoading(true);
    try {
      await shiftService.deleteShift(id);
      loadShifts();
    } catch (e) {
      alert("Error al eliminar");
    } finally {
      setDbLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-20">
      {/* Navbar Superior */}
      <div className="bg-white/80 backdrop-blur-md p-5 border border-slate-200 rounded-[32px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-[50]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-odoo-primary text-white rounded-2xl shadow-lg shadow-odoo-primary/20">
            <CalendarDays size={20}/>
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Planificador San José</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
               {dbLoading && <RefreshCw size={10} className="animate-spin text-odoo-primary"/>}
               Asignación Masiva Semanal / Quincenal / Mensual
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
          <button 
            onClick={() => setActiveView('schedule')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'schedule' ? 'bg-white text-odoo-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-400'}`}
          >
            Cronograma
          </button>
          <button 
            onClick={() => setActiveView('roster')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'roster' ? 'bg-white text-odoo-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-400'}`}
          >
            Colaboradores
          </button>
        </div>
      </div>

      {activeView === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-[32px] p-6 hover:border-odoo-primary/30 transition-all group relative shadow-sm overflow-hidden">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-odoo-primary font-black text-xl border border-slate-100 mb-4 group-hover:scale-105 transition-transform">
                   {emp.name.charAt(0)}
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase text-center line-clamp-1">{emp.name}</h3>
                <p className="text-[9px] font-bold text-odoo-primary uppercase mt-1 opacity-60 tracking-tighter">{emp.job_title || 'Colaborador SJS'}</p>
                {isAdmin && (
                  <button 
                    onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }}
                    className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-odoo-primary transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-100"
                  >
                    <Plus size={14}/> Programar Rango
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'schedule' && (
        <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/40">
          <div className="px-8 py-6 border-b bg-slate-50/50 flex justify-between items-center">
             <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Cronograma Activo en Tiempo Real</h3>
             {isAdmin && (
               <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-3 px-6 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-odoo-primary/20">
                 <Plus size={16}/> Programar Rango
               </button>
             )}
          </div>
          <div className="overflow-x-auto custom-scrollbar max-h-[600px]">
             <table className="w-full text-left">
               <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase border-b sticky top-0 z-10 backdrop-blur-sm">
                 <tr>
                   <th className="px-8 py-4">Colaborador</th>
                   <th className="px-8 py-4">Sede / Punto</th>
                   <th className="px-8 py-4">Fecha</th>
                   <th className="px-8 py-4">Horario</th>
                   <th className="px-8 py-4">Tipo</th>
                   <th className="px-8 py-4 text-right"></th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {shifts.map(shift => (
                   <tr key={shift.id} className={`hover:bg-slate-50/80 transition-colors group ${shift.shift_type === 'descanso' ? 'opacity-60 grayscale' : ''}`}>
                     <td className="px-8 py-4">
                       <span className="text-xs font-bold text-slate-700 uppercase">{shift.employee_name}</span>
                     </td>
                     <td className="px-8 py-4">
                       <span className={`text-[10px] font-black uppercase ${shift.shift_type === 'descanso' ? 'text-slate-300' : 'text-slate-400'}`}>{shift.pos_name}</span>
                     </td>
                     <td className="px-8 py-4">
                       <span className="text-xs font-bold text-slate-600 uppercase">
                          {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {weekday: 'short', day: '2-digit', month: 'short'})}
                       </span>
                     </td>
                     <td className="px-8 py-4">
                        {shift.shift_type === 'descanso' ? (
                          <div className="flex items-center gap-2 text-slate-300">
                             <Coffee size={12}/> <span className="text-[9px] font-black uppercase tracking-widest">Día Libre</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200/50">
                            {shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}
                          </span>
                        )}
                     </td>
                     <td className="px-8 py-4">
                       <span className={`text-[8px] font-black px-2.5 py-1 rounded-full uppercase ${
                         shift.shift_type === 'mañana' ? 'bg-amber-100 text-amber-600' :
                         shift.shift_type === 'tarde' ? 'bg-indigo-100 text-indigo-600' :
                         shift.shift_type === 'noche' ? 'bg-slate-800 text-white' : 
                         shift.shift_type === 'descanso' ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'
                       }`}>
                         {shift.shift_type}
                       </span>
                     </td>
                     <td className="px-8 py-4 text-right">
                       {isAdmin && (
                         <button onClick={() => deleteShift(shift.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            <X size={16}/>
                         </button>
                       )}
                     </td>
                   </tr>
                 ))}
                 {shifts.length === 0 && (
                   <tr>
                     <td colSpan={6} className="px-8 py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic opacity-40">No hay turnos programados</td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Modal Rediseñado - Ultra Compacto con soporte de Rango */}
      {showAddShift && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
           <form onSubmit={handleAddShiftRange} className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-fade my-auto border border-white">
              <div className="px-8 py-6 bg-slate-50 border-b flex justify-between items-center">
                 <div>
                   <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Programar Rango de Fechas</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Asignación Masiva Cloud Sync</p>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="p-2 bg-white rounded-xl shadow-sm text-slate-400 hover:text-red-500 transition-all border border-slate-100">
                    <X size={20}/>
                 </button>
              </div>
              
              <div className="p-8 space-y-6">
                 {/* Fila 1: Colaborador */}
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Colaborador Odoo</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-odoo-primary/10 transition-all cursor-pointer">
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                 </div>

                 {/* Fila 2: Rango de Fechas */}
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Fecha Inicio</label>
                       <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Fecha Fin</label>
                       <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                 </div>

                 {/* Fila 3: Tipo de Jornada */}
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Tipo de Jornada / Turno</label>
                    <select 
                       value={shiftType}
                       onChange={(e) => setShiftType(e.target.value as any)}
                       className={`w-full border rounded-2xl px-5 py-4 text-xs font-black uppercase transition-all outline-none ${shiftType === 'descanso' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                    >
                       <option value="mañana">☀ Mañana</option>
                       <option value="tarde">🌇 Tarde</option>
                       <option value="completo">⚡ Completo</option>
                       <option value="noche">🌙 Noche</option>
                       <option value="descanso">💤 Descanso / Vacaciones</option>
                    </select>
                 </div>

                 {shiftType !== 'descanso' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade">
                      <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Punto de Venta Destino</label>
                         <select name="pos_id" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none">
                            {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Entrada</label>
                            <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700" defaultValue="08:00"/>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Salida</label>
                            <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700" defaultValue="14:00"/>
                         </div>
                      </div>
                   </div>
                 )}

                 {shiftType === 'descanso' && (
                   <div className="p-5 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center space-y-2">
                      <Coffee size={24} className="mx-auto text-slate-300"/>
                      <p className="text-[10px] font-black text-slate-500 uppercase">Período de Descanso</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase italic leading-tight">Las fechas en este rango se marcarán como LIBRES en el cronograma.</p>
                   </div>
                 )}

                 <button type="submit" disabled={dbLoading} className="w-full bg-odoo-primary text-white py-5 rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-odoo-primary/30 flex items-center justify-center gap-3 hover:translate-y-[-2px] active:scale-[0.98] transition-all disabled:opacity-50">
                    {dbLoading ? <RefreshCw size={18} className="animate-spin"/> : <><Check size={20}/> Confirmar Programación Masiva</>}
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
