
import React, { useState, useEffect } from 'react';
import { 
  Users, Calendar, MapPin, Clock, Plus, 
  Mail, X, RefreshCw, Coffee,
  CalendarDays, Check, Info, AlertCircle, Zap
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

const DAYS_OF_WEEK = [
  { label: 'Lunes', value: 1, short: 'L' },
  { label: 'Martes', value: 2, short: 'M' },
  { label: 'Miércoles', value: 3, short: 'M' },
  { label: 'Jueves', value: 4, short: 'J' },
  { label: 'Viernes', value: 5, short: 'V' },
  { label: 'Sábado', value: 6, short: 'S' },
  { label: 'Domingo', value: 0, short: 'D' },
];

export const StaffManagement: React.FC<StaffManagementProps> = ({ 
  isAdmin, employees, posConfigs, currentUserEmail, loading: odooLoading 
}) => {
  const [activeView, setActiveView] = useState<'roster' | 'schedule'>('schedule');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [shiftType, setShiftType] = useState<'mañana' | 'tarde' | 'completo' | 'noche' | 'descanso'>('mañana');
  const [restDays, setRestDays] = useState<number[]>([0]); // Por defecto domingos

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

  const toggleRestDay = (day: number) => {
    setRestDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

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

    const start = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');
    const shiftBatch: any[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const isRestDay = restDays.includes(d.getDay());
      const currentShiftType = isRestDay ? 'descanso' : shiftType;

      shiftBatch.push({
        employee_id: empId,
        employee_name: emp?.name || 'Desconocido',
        employee_email: emp?.work_email || '',
        pos_id: isRestDay ? 0 : posId,
        pos_name: isRestDay ? 'LIBRE (DESCANSO)' : (pos?.name || 'Sin Sede'),
        date: d.toISOString().split('T')[0],
        shift_type: currentShiftType,
        start_time: isRestDay ? '00:00' : formData.get('start'),
        end_time: isRestDay ? '00:00' : formData.get('end'),
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
    <div className="max-w-[1400px] mx-auto space-y-6 animate-fade pb-24">
      {/* Header Panel Superior */}
      <div className="bg-white/95 backdrop-blur-md p-6 border border-slate-200 rounded-[32px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 sticky top-0 z-[40]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-odoo-primary text-white rounded-2xl shadow-lg shadow-odoo-primary/20">
            <CalendarDays size={24}/>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Control de Horarios</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
               {dbLoading && <RefreshCw size={12} className="animate-spin text-odoo-primary"/>}
               Programación Mensual y Gestión de Descansos
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveView('schedule')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'schedule' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Cronograma Operativo
          </button>
          <button 
            onClick={() => setActiveView('roster')} 
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'roster' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Nómina de Personal
          </button>
        </div>
      </div>

      {activeView === 'roster' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade">
          {employees.map(emp => (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-[32px] p-6 hover:border-odoo-primary/30 transition-all group shadow-sm hover:shadow-xl hover:shadow-slate-200/50 relative overflow-hidden">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-odoo-primary font-black text-2xl border border-slate-100 mb-4 group-hover:scale-110 transition-transform">
                   {emp.name.charAt(0)}
                </div>
                <h3 className="text-xs font-black text-slate-800 uppercase text-center line-clamp-1">{emp.name}</h3>
                <p className="text-[9px] font-bold text-odoo-primary uppercase mt-1.5 opacity-60 tracking-tighter">{emp.job_title || 'Colaborador SJS'}</p>
                {isAdmin && (
                  <button 
                    onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} 
                    className="w-full mt-6 bg-slate-900 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-odoo-primary transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16}/> Programar Mes
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeView === 'schedule' && (
        <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-xl shadow-slate-200/40 animate-fade">
          <div className="px-8 py-6 border-b bg-slate-50/50 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Clock size={20} className="text-odoo-primary"/>
                <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em]">Registro de Actividad y Jornadas</h3>
             </div>
             {isAdmin && (
               <button 
                onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} 
                className="bg-odoo-primary text-white py-3.5 px-6 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-odoo-primary/20 hover:scale-[1.02] transition-all active:scale-95"
               >
                 <Plus size={18}/> Nueva Programación Masiva
               </button>
             )}
          </div>
          <div className="overflow-x-auto custom-scrollbar max-h-[650px]">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b sticky top-0 z-10 backdrop-blur-md">
                 <tr>
                   <th className="px-8 py-5">Colaborador</th>
                   <th className="px-8 py-5">Punto de Venta / Destino</th>
                   <th className="px-8 py-5">Fecha Programada</th>
                   <th className="px-8 py-5">Rango de Hora</th>
                   <th className="px-8 py-5">Tipo Jornada</th>
                   <th className="px-8 py-5 text-right">Acciones</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {shifts.map(shift => (
                   <tr key={shift.id} className={`hover:bg-slate-50/80 transition-colors group ${shift.shift_type === 'descanso' ? 'bg-slate-50/40 italic' : ''}`}>
                     <td className="px-8 py-5">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${shift.shift_type === 'descanso' ? 'bg-slate-200 text-slate-400' : 'bg-odoo-primary/10 text-odoo-primary'}`}>
                             {shift.employee_name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-700 uppercase">{shift.employee_name}</span>
                       </div>
                     </td>
                     <td className="px-8 py-5">
                       <div className="flex items-center gap-2">
                          <MapPin size={12} className={shift.shift_type === 'descanso' ? 'text-slate-300' : 'text-odoo-primary/40'}/>
                          <span className={`text-[10px] font-black uppercase ${shift.shift_type === 'descanso' ? 'text-slate-300' : 'text-slate-500'}`}>{shift.pos_name}</span>
                       </div>
                     </td>
                     <td className="px-8 py-5">
                       <span className="text-xs font-bold text-slate-600 uppercase">
                          {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {weekday: 'short', day: '2-digit', month: 'short'})}
                       </span>
                     </td>
                     <td className="px-8 py-5">
                        {shift.shift_type === 'descanso' ? (
                          <div className="flex items-center gap-2 text-slate-300">
                             <Coffee size={14}/> <span className="text-[10px] font-black uppercase tracking-widest">Libre</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200/50">
                             <Clock size={12} className="text-slate-400"/>
                             <span className="text-[10px] font-black text-slate-600 tracking-tighter">{shift.start_time.slice(0,5)} — {shift.end_time.slice(0,5)}</span>
                          </div>
                        )}
                     </td>
                     <td className="px-8 py-5">
                       <span className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-tighter shadow-sm ${
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
                         <button onClick={() => deleteShift(shift.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 bg-white shadow-sm border border-slate-100 rounded-xl">
                            <X size={16}/>
                         </button>
                       )}
                     </td>
                   </tr>
                 ))}
                 {shifts.length === 0 && !dbLoading && (
                   <tr>
                     <td colSpan={6} className="py-24 text-center">
                        <Calendar size={48} className="mx-auto text-slate-100 mb-4"/>
                        <p className="text-xs font-black text-slate-300 uppercase tracking-[0.3em]">No hay actividad registrada</p>
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
          </div>
        </div>
      )}

      {/* MODAL OPTIMIZADO PARA MÓVIL Y LAPS: "Ficha de Programación" */}
      {showAddShift && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-md overflow-hidden">
           <form 
            onSubmit={handleAddShiftRange} 
            className="relative w-full max-w-4xl bg-white rounded-[32px] sm:rounded-[48px] shadow-2xl overflow-hidden animate-fade border border-white flex flex-col max-h-[96vh] sm:max-h-[92vh]"
           >
              {/* Header Modal - Compactado */}
              <div className="px-6 sm:px-10 py-5 sm:py-8 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-odoo-primary rounded-xl sm:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-odoo-primary/20">
                      <Plus size={20}/>
                    </div>
                    <div>
                      <h3 className="text-base sm:text-xl font-black uppercase text-slate-800 tracking-tight leading-none">Nueva Programación</h3>
                      <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-1.5 flex items-center gap-2">
                        <Zap size={10} className="text-odoo-primary"/> Gestión Mensual
                      </p>
                    </div>
                 </div>
                 <button 
                  type="button" 
                  onClick={() => setShowAddShift(false)} 
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white rounded-xl sm:rounded-2xl shadow-sm text-slate-400 hover:text-red-500 transition-all border border-slate-100"
                 >
                    <X size={20}/>
                 </button>
              </div>
              
              {/* Body Modal Scrollable - Rellenos responsivos */}
              <div className="p-5 sm:p-10 overflow-y-auto custom-scrollbar flex-1 space-y-6 sm:space-y-8 bg-white">
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-10">
                    {/* Columna 1 */}
                    <div className="space-y-4 sm:space-y-6">
                       <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-50 pb-2">
                         <Users size={14}/> Datos Básicos
                       </h4>
                       
                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Colaborador</label>
                          <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-[12px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-odoo-primary/5 transition-all">
                             {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                          </select>
                       </div>

                       <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Inicio</label>
                             <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-[12px] font-bold text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Fin</label>
                             <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-[12px] font-bold text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                          </div>
                       </div>
                    </div>

                    {/* Columna 2 */}
                    <div className="space-y-4 sm:space-y-6">
                       <h4 className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-slate-50 pb-2">
                         <Clock size={14}/> Jornada
                       </h4>

                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Turno Base</label>
                          <select 
                            value={shiftType} 
                            onChange={(e) => setShiftType(e.target.value as any)} 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-[12px] font-black uppercase text-slate-700 outline-none"
                          >
                             <option value="mañana">☀ Mañana</option>
                             <option value="tarde">🌆 Tarde</option>
                             <option value="completo">⚡ Completo</option>
                             <option value="noche">🌙 Noche</option>
                          </select>
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Sede / Botica</label>
                          <select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-[12px] font-bold text-slate-700 outline-none">
                             {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                       </div>
                       
                       <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className="space-y-1.5">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Entrada</label>
                             <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-[12px] font-bold text-slate-700" defaultValue="08:00"/>
                          </div>
                          <div className="space-y-1.5">
                             <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Salida</label>
                             <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-[12px] font-bold text-slate-700" defaultValue="14:00"/>
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Descansos - Más compactos para móvil */}
                 <div className="pt-5 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                       <label className="text-[9px] sm:text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                         <Coffee size={14} className="text-odoo-primary"/> Descanso Semanal
                       </label>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-3">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                           key={day.value}
                           type="button"
                           onClick={() => toggleRestDay(day.value)}
                           className={`relative py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase transition-all border flex flex-col items-center justify-center gap-1 ${
                             restDays.includes(day.value) 
                             ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-[1.02]' 
                             : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-white'
                           }`}
                         >
                           {restDays.includes(day.value) && (
                              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                <Check size={8} strokeWidth={4}/>
                              </div>
                           )}
                           <span className="opacity-60 text-[7px] sm:text-[8px]">{day.label}</span>
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              {/* Footer Modal - Siempre al final y visible */}
              <div className="px-6 sm:px-10 py-5 sm:py-8 bg-slate-50 border-t shrink-0">
                 <button 
                  type="submit" 
                  disabled={dbLoading} 
                  className="w-full bg-odoo-primary text-white py-4 sm:py-5 rounded-2xl sm:rounded-[28px] font-black uppercase text-[10px] sm:text-[12px] tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50"
                 >
                    {dbLoading ? (
                      <RefreshCw size={18} className="animate-spin"/> 
                    ) : (
                      <Check size={20}/> 
                    )}
                    <span>{dbLoading ? 'Procesando...' : 'Confirmar Programación'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
