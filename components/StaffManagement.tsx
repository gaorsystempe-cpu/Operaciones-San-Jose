
import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MapPin, Clock, Plus, 
  Briefcase, Mail, X, RefreshCw, Coffee,
  ChevronRight, CalendarDays, Check, LayoutGrid
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

  const handleAddShift = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDbLoading(true);
    const formData = new FormData(e.currentTarget);
    const empId = Number(formData.get('employee_id'));
    const posId = Number(formData.get('pos_id'));
    const emp = employees.find(e => e.id === empId);
    const pos = posConfigs.find(p => p.id === posId);

    const isDescanso = shiftType === 'descanso';

    try {
      await shiftService.createShift({
        employee_id: empId,
        employee_name: emp?.name || 'Desconocido',
        employee_email: emp?.work_email || '',
        pos_id: posId,
        pos_name: isDescanso ? 'LIBRE' : (pos?.name || 'Sin Sede'),
        date: formData.get('date'),
        shift_type: shiftType,
        start_time: isDescanso ? '00:00' : formData.get('start'),
        end_time: isDescanso ? '00:00' : formData.get('end'),
        status: 'confirmed',
        created_by: currentUserEmail
      });
      setShowAddShift(false);
      loadShifts();
    } catch (e) {
      alert("Error: " + (e as any).message);
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
      {/* Navbar Superior Refinado */}
      <div className="bg-white/70 backdrop-blur-md p-5 border border-slate-200 rounded-[32px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-[50]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-odoo-primary text-white rounded-2xl shadow-lg shadow-odoo-primary/20">
            <CalendarDays size={20}/>
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Planificador San José</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
               {dbLoading && <RefreshCw size={10} className="animate-spin text-odoo-primary"/>}
               Control Mensual de Horarios y Descansos
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
          <button 
            onClick={() => setActiveView('schedule')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'schedule' ? 'bg-white text-odoo-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Clock size={14}/> {isAdmin ? 'Cronograma General' : 'Mi Agenda'}
          </button>
          <button 
            onClick={() => setActiveView('roster')}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeView === 'roster' ? 'bg-white text-odoo-primary shadow-sm ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Users size={14}/> Nómina Odoo
          </button>
        </div>
      </div>

      {activeView === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-[32px] p-6 hover:border-odoo-primary/30 transition-all group overflow-hidden relative shadow-sm hover:shadow-xl hover:shadow-slate-200/50">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-odoo-primary font-black text-2xl border border-slate-100 mb-4 group-hover:scale-110 transition-transform duration-500">
                   {emp.name.charAt(0)}
                </div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-1">{emp.name}</h3>
                <p className="text-[10px] font-bold text-odoo-primary uppercase mt-1 opacity-70">{emp.job_title || 'Colaborador SJS'}</p>
                
                <div className="w-full mt-6 pt-6 border-t border-slate-50 space-y-2.5">
                   <div className="flex items-center justify-center gap-2 text-slate-400">
                      <Mail size={12} />
                      <span className="text-[10px] font-bold truncate lowercase">{emp.work_email || 'sin-email@sjs.pe'}</span>
                   </div>
                   {isAdmin && (
                      <button 
                        onClick={() => { setSelectedEmployee(emp); setShiftType('mañana'); setShowAddShift(true); }}
                        className="w-full bg-slate-900 text-white py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-odoo-primary transition-all flex items-center justify-center gap-2 mt-2 shadow-lg shadow-slate-200"
                      >
                        <Plus size={14}/> Asignar Fecha
                      </button>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'schedule' && (
        <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/50">
          <div className="px-8 py-7 border-b bg-slate-50/30 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Calendar size={18} className="text-odoo-primary"/>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Planificación Mensual: {new Date().toLocaleDateString('es-PE', {month: 'long', year: 'numeric'})}</h3>
             </div>
             {isAdmin && (
               <button onClick={() => { setSelectedEmployee(null); setShiftType('mañana'); setShowAddShift(true); }} className="bg-odoo-primary text-white py-3 px-6 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-odoo-primary/20 hover:scale-105 transition-transform active:scale-95">
                 <Plus size={16}/> Programar Turno
               </button>
             )}
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50/50 text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                 <tr>
                   <th className="px-8 py-5">Colaborador</th>
                   <th className="px-8 py-5">Punto de Venta</th>
                   <th className="px-8 py-5">Fecha</th>
                   <th className="px-8 py-5">Horario</th>
                   <th className="px-8 py-5">Tipo</th>
                   <th className="px-8 py-5 text-right">Acción</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {shifts.map(shift => (
                   <tr key={shift.id} className={`hover:bg-slate-50/80 transition-colors group ${shift.shift_type === 'descanso' ? 'opacity-60 bg-slate-50/20' : ''}`}>
                     <td className="px-8 py-5">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${shift.shift_type === 'descanso' ? 'bg-slate-100 text-slate-400' : 'bg-odoo-primary/10 text-odoo-primary'}`}>
                             {shift.employee_name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-700 uppercase">{shift.employee_name}</span>
                       </div>
                     </td>
                     <td className="px-8 py-5">
                       <div className="flex items-center gap-2">
                          <MapPin size={12} className={shift.shift_type === 'descanso' ? 'text-slate-300' : 'text-odoo-primary/40'}/>
                          <span className={`text-[10px] font-black uppercase ${shift.shift_type === 'descanso' ? 'text-slate-400 italic' : 'text-slate-600'}`}>
                            {shift.pos_name}
                          </span>
                       </div>
                     </td>
                     <td className="px-8 py-5">
                       <span className="text-xs font-bold text-slate-600 uppercase">
                          {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {weekday: 'short', day: '2-digit', month: 'short'})}
                       </span>
                     </td>
                     <td className="px-8 py-5">
                        {shift.shift_type === 'descanso' ? (
                          <div className="flex items-center gap-2 text-slate-400">
                             <Coffee size={14} className="opacity-50"/>
                             <span className="text-[10px] font-black uppercase tracking-widest">Día Libre</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg w-fit border border-slate-200/50">
                             <Clock size={12} className="text-slate-400"/>
                             <span className="text-[10px] font-black text-slate-600">{shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}</span>
                          </div>
                        )}
                     </td>
                     <td className="px-8 py-5">
                       <span className={`text-[8px] font-black px-2.5 py-1.5 rounded-full uppercase tracking-tighter ${
                         shift.shift_type === 'mañana' ? 'bg-amber-100 text-amber-600' :
                         shift.shift_type === 'tarde' ? 'bg-indigo-100 text-indigo-600' :
                         shift.shift_type === 'noche' ? 'bg-slate-800 text-white' : 
                         shift.shift_type === 'descanso' ? 'bg-slate-200 text-slate-500' : 'bg-emerald-100 text-emerald-600'
                       }`}>
                         {shift.shift_type}
                       </span>
                     </td>
                     <td className="px-8 py-5 text-right">
                       {isAdmin && (
                         <button onClick={() => deleteShift(shift.id)} className="p-2 text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-slate-100 rounded-lg">
                            <X size={16}/>
                         </button>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* Modal Rediseñado: Más Compacto y Elegante */}
      {showAddShift && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowAddShift(false)}></div>
           <form onSubmit={handleAddShift} className="relative w-full max-w-md bg-white rounded-[48px] shadow-2xl overflow-hidden animate-fade border border-white">
              <div className="p-10 border-b border-slate-100">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight">Programar Fecha</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Operaciones San José • Cloud Sync</p>
                    </div>
                    <button type="button" onClick={() => setShowAddShift(false)} className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"><X size={20}/></button>
                 </div>
                 
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Asignar Colaborador</label>
                       <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-odoo-primary/10 transition-all appearance-none cursor-pointer">
                          {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                       </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Día Programado</label>
                          <input type="date" name="date" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Jornada</label>
                          <select 
                             value={shiftType}
                             onChange={(e) => setShiftType(e.target.value as any)}
                             className={`w-full border rounded-2xl px-5 py-4 text-xs font-black uppercase transition-all outline-none ${shiftType === 'descanso' ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}
                          >
                             <option value="mañana">☀ Mañana</option>
                             <option value="tarde">🌆 Tarde</option>
                             <option value="completo">⚡ Completo</option>
                             <option value="noche">🌙 Noche</option>
                             <option value="descanso">💤 Descanso</option>
                          </select>
                       </div>
                    </div>

                    {shiftType !== 'descanso' ? (
                       <div className="space-y-6 animate-fade">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Punto de Venta / Sede</label>
                             <select name="pos_id" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer">
                                {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                             </select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Entrada</label>
                                <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700" defaultValue="08:00"/>
                             </div>
                             <div className="space-y-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Salida</label>
                                <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700" defaultValue="14:00"/>
                             </div>
                          </div>
                       </div>
                    ) : (
                       <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center space-y-2 animate-fade">
                          <Coffee className="mx-auto text-slate-300" size={32}/>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Día de Descanso Configurado</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase italic opacity-60 px-4">Este colaborador no aparecerá en el roster activo de ese día.</p>
                       </div>
                    )}

                    <button type="submit" disabled={dbLoading} className="w-full bg-odoo-primary text-white py-5 rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-odoo-primary/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4">
                       {dbLoading ? <RefreshCw size={18} className="animate-spin"/> : <><Check size={18}/> Confirmar Asignación</>}
                    </button>
                 </div>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
