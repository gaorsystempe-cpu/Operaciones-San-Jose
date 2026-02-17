
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Clock, Plus, X, RefreshCw, 
  ChevronLeft, ChevronRight, CalendarDays, Check, 
  MapPin, Sun, Moon, Zap, Coffee,
  ShieldCheck, Briefcase
} from 'lucide-react';
import { Employee, Shift } from '../types';
import { shiftService } from '../services/supabaseService';

const DAYS_OF_WEEK = [
  { label: 'Dom', value: 0 },
  { label: 'Lun', value: 1 },
  { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 5 },
  { label: 'Sáb', value: 6 },
];

const EmployeeCalendar = ({ 
  employee, 
  shifts, 
  onClose 
}: { 
  employee: Employee; 
  shifts: Shift[]; 
  onClose: () => void 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return { firstDay, days, year, month };
  }, [currentDate]);

  const monthName = currentDate.toLocaleString('es-PE', { month: 'long', year: 'numeric' });

  const getShiftForDay = (day: number) => {
    const dateStr = `${daysInMonth.year}-${String(daysInMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.find(s => s.date === dateStr);
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-end animate-fade">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Cabecera Compacta */}
        <div className="bg-white px-6 py-3 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-odoo-primary rounded-lg flex items-center justify-center text-white font-black text-sm">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase leading-none">{employee.name}</h3>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Calendario Operativo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
            <X size={18}/>
          </button>
        </div>

        {/* Navegación y Leyenda */}
        <div className="px-6 py-2 bg-slate-50 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-slate-200">
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month - 1, 1))} className="text-slate-400 hover:text-odoo-primary"><ChevronLeft size={14}/></button>
            <h4 className="text-[9px] font-black text-slate-700 uppercase min-w-[100px] text-center">{monthName}</h4>
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month + 1, 1))} className="text-slate-400 hover:text-odoo-primary"><ChevronRight size={14}/></button>
          </div>
          <div className="flex gap-3">
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></div>
                <span className="text-[8px] font-black text-slate-500 uppercase">Trabajo</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></div>
                <span className="text-[8px] font-black text-slate-500 uppercase">Descanso</span>
             </div>
          </div>
        </div>

        {/* Grid de Calendario Miniaturizado */}
        <div className="flex-1 p-4 bg-slate-50/50 overflow-hidden">
          <div className="grid grid-cols-7 gap-1 h-full max-h-[calc(100vh-180px)]">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[8px] font-black text-slate-300 uppercase pb-1">{d}</div>
            ))}
            
            {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-transparent rounded-lg border border-transparent" />
            ))}

            {Array.from({ length: daysInMonth.days }).map((_, i) => {
              const day = i + 1;
              const shift = getShiftForDay(day);
              const isToday = new Date().toDateString() === new Date(daysInMonth.year, daysInMonth.month, day).toDateString();
              
              const isWork = shift && shift.shift_type !== 'descanso';
              const isRest = shift && shift.shift_type === 'descanso';

              return (
                <div 
                  key={day} 
                  className={`relative rounded-lg p-2 border transition-all flex flex-col justify-between ${
                    isToday ? 'ring-2 ring-odoo-primary border-odoo-primary bg-white shadow-md z-10' : 
                    isWork ? 'bg-emerald-100 border-emerald-200' :
                    isRest ? 'bg-slate-200 border-slate-300 opacity-80' :
                    'bg-white border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-black ${isToday ? 'text-odoo-primary' : (isWork ? 'text-emerald-900' : (isRest ? 'text-slate-600' : 'text-slate-300'))}`}>
                      {day}
                    </span>
                    {isToday && <span className="text-[6px] font-black bg-odoo-primary text-white px-1 rounded-sm uppercase">Hoy</span>}
                  </div>

                  {shift && (
                    <div className="mt-1">
                      <p className={`text-[7px] font-black uppercase truncate ${isWork ? 'text-emerald-800' : 'text-slate-500'}`}>
                        {shift.shift_type === 'descanso' ? 'LIBRE' : shift.shift_type}
                      </p>
                      {isWork && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                           <div className="flex items-center gap-0.5 text-[8px] font-bold text-emerald-900">
                             <Clock size={8}/> {shift.start_time.slice(0,5)}
                           </div>
                           <p className="text-[6px] font-bold text-emerald-700/60 uppercase truncate">{shift.pos_name}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="px-6 py-3 border-t bg-white flex justify-between items-center shrink-0">
          <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">San José Ops Hub 2026</p>
          <div className="flex items-center gap-1.5 opacity-50">
             <ShieldCheck size={12} className="text-emerald-500"/>
             <span className="text-[8px] font-black text-slate-500 uppercase">Verificado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StaffManagementProps {
  isAdmin: boolean;
  employees: Employee[];
  posConfigs: any[];
  currentUserEmail?: string;
  loading: boolean;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ 
  isAdmin, employees, posConfigs, currentUserEmail, loading: odooLoading 
}) => {
  const [view, setView] = useState<'roster' | 'global'>('roster');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [showAddShift, setShowAddShift] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [viewCalendarEmp, setViewCalendarEmp] = useState<Employee | null>(null);
  const [shiftType, setShiftType] = useState<'mañana' | 'tarde' | 'completo' | 'noche'>('mañana');
  const [restDays, setRestDays] = useState<number[]>([0]);

  const loadShifts = async () => {
    setDbLoading(true);
    try {
      const data = isAdmin ? await shiftService.getShifts() : (currentUserEmail ? await shiftService.getMyShifts(currentUserEmail) : []);
      setShifts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => { loadShifts(); }, [isAdmin, currentUserEmail]);

  const getEmployeeStatus = (empId: number) => {
    const today = new Date().toISOString().split('T')[0];
    return shifts.find(s => s.employee_id === empId && s.date === today);
  };

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
      shiftBatch.push({
        employee_id: empId,
        employee_name: emp?.name || 'Desconocido',
        employee_email: emp?.work_email || '',
        pos_id: isRestDay ? 0 : posId,
        pos_name: isRestDay ? 'DESCANSO' : (pos?.name || 'Botica SJ'),
        date: d.toISOString().split('T')[0],
        shift_type: isRestDay ? 'descanso' : shiftType,
        start_time: isRestDay ? '00:00:00' : `${formData.get('start')}:00`,
        end_time: isRestDay ? '00:00:00' : `${formData.get('end')}:00`,
        status: 'confirmed',
        created_by: currentUserEmail
      });
    }

    try {
      await shiftService.createShifts(shiftBatch);
      setShowAddShift(false);
      loadShifts();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDbLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-fade pb-32">
      
      {/* Header Compacto */}
      <div className="bg-white p-6 border border-slate-200 rounded-3xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-odoo-primary text-white rounded-xl shadow-lg">
            <Users size={24}/>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Personal & Horarios</h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
               <ShieldCheck size={12} className="text-emerald-500"/> Planificación de Staff
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
           <button onClick={() => setView('roster')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === 'roster' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400'}`}>Fichas</button>
           <button onClick={() => setView('global')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${view === 'global' ? 'bg-white text-odoo-primary shadow-sm' : 'text-slate-400'}`}>Auditoría</button>
        </div>
      </div>

      {view === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {employees.map(emp => {
            const todayShift = getEmployeeStatus(emp.id);
            const isWorking = todayShift && todayShift.shift_type !== 'descanso';
            const isResting = todayShift && todayShift.shift_type === 'descanso';

            return (
              <div 
                key={emp.id} 
                className="bg-white border border-slate-200 rounded-[28px] p-6 hover:border-odoo-primary/30 transition-all shadow-sm group relative flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-2xl font-black text-odoo-primary mb-4 shadow-inner group-hover:bg-odoo-primary group-hover:text-white transition-all">
                  {emp.name.charAt(0)}
                </div>
                
                <h3 className="text-xs font-black text-slate-800 uppercase line-clamp-1 mb-0.5">{emp.name}</h3>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-6">{emp.job_title || 'COLABORADOR'}</p>
                
                {/* Status Hoy Binario */}
                <div className={`w-full p-3 rounded-xl border transition-all ${
                  isWorking ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
                  isResting ? 'bg-slate-100 border-slate-200 text-slate-500' :
                  'bg-slate-50 opacity-40'
                }`}>
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-50 block mb-1">Hoy</span>
                  {todayShift ? (
                    <div className="flex items-center justify-center gap-1">
                       {isWorking ? <Sun size={10}/> : <Coffee size={10}/>}
                       <span className="text-[9px] font-black uppercase">{isWorking ? todayShift.shift_type : 'DESCANSO'}</span>
                    </div>
                  ) : (
                    <span className="text-[9px] font-bold uppercase opacity-20">---</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 w-full mt-6">
                  <button onClick={() => setViewCalendarEmp(emp)} className="bg-white text-slate-600 py-2.5 rounded-lg text-[8px] font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                     <Calendar size={10}/> Ver Mes
                  </button>
                  {isAdmin && (
                    <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="bg-odoo-primary text-white py-2.5 rounded-lg text-[8px] font-black uppercase shadow-lg shadow-odoo-primary/10 hover:scale-[1.02] transition-all">
                      Programar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'global' && (
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
           <div className="px-8 py-4 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <Clock size={20} className="text-odoo-primary"/>
                 <h3 className="text-xs font-black text-slate-600 uppercase tracking-widest">Consolidado General</h3>
              </div>
              {isAdmin && <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-2.5 px-6 rounded-xl text-[9px] font-black uppercase flex items-center gap-2 hover:scale-[1.02] transition-all"><Plus size={16}/> Nueva Carga</button>}
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[8px] font-black text-slate-400 uppercase border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-8 py-4">Staff</th>
                      <th className="px-8 py-4">Sede</th>
                      <th className="px-8 py-4">Fecha</th>
                      <th className="px-8 py-4 text-center">Tipo</th>
                      <th className="px-8 py-4 text-right">Acción</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {shifts.map(shift => {
                       const isRest = shift.shift_type === 'descanso';
                       return (
                        <tr key={shift.id} className="hover:bg-slate-50 transition-colors">
                           <td className="px-8 py-3.5 font-black text-slate-800 uppercase text-[10px]">{shift.employee_name}</td>
                           <td className="px-8 py-3.5 font-bold text-slate-500 uppercase text-[9px]">{shift.pos_name}</td>
                           <td className="px-8 py-3.5 font-bold text-slate-600 uppercase text-[9px]">
                              {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {day: '2-digit', month: 'short'})}
                           </td>
                           <td className="px-8 py-3.5 text-center">
                              <span className={`text-[8px] font-black px-2 py-1 rounded-full uppercase border ${isRest ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                                 {shift.shift_type.toUpperCase()}
                              </span>
                           </td>
                           <td className="px-8 py-3.5 text-right">{isAdmin && <button onClick={() => { if(confirm("¿Eliminar?")) shiftService.deleteShift(shift.id).then(loadShifts); }} className="p-1.5 text-slate-200 hover:text-red-500"><X size={16}/></button>}</td>
                        </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* CALENDARIO INDIVIDUAL MINIATURIZADO */}
      {viewCalendarEmp && (
        <EmployeeCalendar 
          employee={viewCalendarEmp} 
          shifts={shifts.filter(s => s.employee_id === viewCalendarEmp.id)} 
          onClose={() => setViewCalendarEmp(null)} 
        />
      )}

      {/* MODAL DE PROGRAMACIÓN COMPACTO */}
      {showAddShift && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade">
           <form 
            onSubmit={handleAddShiftRange} 
            className="relative w-full max-w-[440px] bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
           >
              <div className="px-8 py-6 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-odoo-primary rounded-xl flex items-center justify-center text-white shadow-lg"><CalendarDays size={20}/></div>
                    <div>
                      <h3 className="text-lg font-black uppercase text-slate-800 tracking-tight">Carga de Horario</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Gestión de Turnos</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-300 hover:text-red-500 border border-slate-100"><X size={20}/></button>
              </div>
              
              <div className="p-8 space-y-5 bg-white overflow-y-auto custom-scrollbar max-h-[60vh]">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Staff</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none">
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Inicio</label>
                       <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fin</label>
                       <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Turno</label>
                      <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[9px] font-black uppercase text-slate-700 outline-none cursor-pointer">
                         <option value="mañana">☀ MAÑANA</option>
                         <option value="tarde">🌆 TARDE</option>
                         <option value="completo">⚡ FULL DAY</option>
                         <option value="noche">🌙 NOCHE</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sede</label>
                      <select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-[9px] font-black uppercase text-slate-700 outline-none cursor-pointer">
                         {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Entrada</label>
                       <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none" defaultValue="08:00"/>
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Salida</label>
                       <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none" defaultValue="14:00"/>
                    </div>
                 </div>

                 <div className="pt-4 border-t border-slate-100">
                    <label className="text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
                       <Coffee size={14} className="text-emerald-500"/> Definir Descansos Semanales
                    </label>
                    <div className="grid grid-cols-7 gap-1.5">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                            key={day.value} 
                            type="button" 
                            onClick={() => toggleRestDay(day.value)} 
                            className={`py-3 rounded-lg text-[8px] font-black uppercase transition-all border flex flex-col items-center justify-center gap-1 ${
                              restDays.includes(day.value) 
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg scale-95' 
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'
                            }`}
                         >
                           {day.label}
                           {restDays.includes(day.value) && <div className="w-1 h-1 bg-white rounded-full"></div>}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="px-8 py-6 bg-slate-50 border-t">
                 <button 
                  type="submit" 
                  disabled={dbLoading} 
                  className="w-full bg-odoo-primary text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-odoo-primary/20 flex items-center justify-center gap-3 hover:bg-[#5e3e55] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {dbLoading ? <RefreshCw size={18} className="animate-spin"/> : <Check size={18}/>}
                    <span>{dbLoading ? 'Guardando...' : 'Publicar Horario'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
