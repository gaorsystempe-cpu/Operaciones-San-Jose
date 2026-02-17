
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

// Configuración de Colores según Requerimiento Operativo
const SHIFT_THEMES: Record<string, { 
  bg: string, 
  text: string, 
  border: string, 
  icon: any, 
  label: string,
  indicator: string 
}> = {
  'mañana': { 
    bg: 'bg-emerald-50', // Verde claro para trabajo
    text: 'text-emerald-900', 
    border: 'border-emerald-200', 
    icon: <Sun size={12} />,
    label: 'MAÑANA',
    indicator: 'bg-emerald-500'
  },
  'tarde': { 
    bg: 'bg-emerald-50', // Verde claro para trabajo
    text: 'text-emerald-900', 
    border: 'border-emerald-200', 
    icon: <Moon size={12} />,
    label: 'TARDE',
    indicator: 'bg-emerald-500'
  },
  'completo': { 
    bg: 'bg-emerald-100', // Verde un poco más fuerte para jornada completa
    text: 'text-emerald-900', 
    border: 'border-emerald-300', 
    icon: <Zap size={12} />,
    label: 'FULL DAY',
    indicator: 'bg-emerald-600'
  },
  'noche': { 
    bg: 'bg-emerald-50', // Verde para trabajo nocturno
    text: 'text-emerald-900', 
    border: 'border-emerald-200', 
    icon: <Moon size={12} />,
    label: 'NOCHE',
    indicator: 'bg-emerald-500'
  },
  'descanso': { 
    bg: 'bg-slate-100', // Color neutro para descanso
    text: 'text-slate-500', 
    border: 'border-slate-200', 
    icon: <Coffee size={12} />,
    label: 'DESCANSO',
    indicator: 'bg-slate-300'
  }
};

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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header Compacto */}
        <div className="bg-white px-8 py-5 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-odoo-primary rounded-xl flex items-center justify-center text-white font-black text-lg">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase leading-none">{employee.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cronograma de Asistencias</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-all text-slate-400">
            <X size={24}/>
          </button>
        </div>

        {/* Controles y Leyenda */}
        <div className="px-8 py-3 bg-slate-50 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200">
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month - 1, 1))} className="p-1.5 hover:bg-slate-50 rounded text-slate-400"><ChevronLeft size={16}/></button>
            <h4 className="text-[10px] font-black text-slate-700 uppercase min-w-[140px] text-center tracking-widest">{monthName}</h4>
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month + 1, 1))} className="p-1.5 hover:bg-slate-50 rounded text-slate-400"><ChevronRight size={16}/></button>
          </div>
          <div className="flex gap-4">
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-400"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase">Días Laborales</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-slate-300"></div>
                <span className="text-[9px] font-black text-slate-500 uppercase">Descanso</span>
             </div>
          </div>
        </div>

        {/* Grid del Calendario - Optimizada para pantalla completa */}
        <div className="flex-1 p-6 overflow-hidden">
          <div className="grid grid-cols-7 gap-2 h-full">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="pb-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
            ))}
            
            {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-100" />
            ))}

            {Array.from({ length: daysInMonth.days }).map((_, i) => {
              const day = i + 1;
              const shift = getShiftForDay(day);
              const isToday = new Date().toDateString() === new Date(daysInMonth.year, daysInMonth.month, day).toDateString();
              const theme = shift ? SHIFT_THEMES[shift.shift_type] : null;

              return (
                <div 
                  key={day} 
                  className={`relative rounded-2xl p-3 border transition-all flex flex-col group ${
                    isToday 
                      ? 'ring-4 ring-odoo-primary/10 border-odoo-primary bg-white shadow-xl scale-[1.02] z-20' 
                      : (theme ? `${theme.bg} ${theme.border}` : 'bg-white border-slate-100')
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[11px] font-black ${isToday ? 'text-odoo-primary' : (theme ? theme.text : 'text-slate-300')}`}>
                      {String(day).padStart(2, '0')}
                    </span>
                    {isToday && <span className="text-[7px] font-black bg-odoo-primary text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">Hoy</span>}
                  </div>

                  {shift ? (
                    <div className="flex-1 flex flex-col justify-end">
                       <div className="flex items-center gap-1.5 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${theme?.indicator}`}></div>
                          <span className={`text-[9px] font-black uppercase ${theme?.text}`}>{theme?.label}</span>
                       </div>
                       {shift.shift_type !== 'descanso' ? (
                         <div className="space-y-0.5">
                            <div className={`flex items-center gap-1 text-[10px] font-bold ${theme?.text}`}>
                               <Clock size={10}/> {shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}
                            </div>
                            <div className={`flex items-center gap-1 text-[8px] font-medium opacity-70 uppercase truncate ${theme?.text}`}>
                               <MapPin size={9}/> {shift.pos_name}
                            </div>
                         </div>
                       ) : (
                         <div className="text-[8px] font-bold text-slate-400 uppercase italic">Libre</div>
                       )}
                    </div>
                  ) : null}
                </div>
              );
            })}
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
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-32">
      
      {/* Header Corporativo Compacto */}
      <div className="bg-white p-8 border border-slate-200 rounded-[32px] shadow-sm flex flex-col lg:flex-row justify-between items-center gap-6 relative overflow-hidden">
        <div className="flex items-center gap-6 z-10">
          <div className="p-5 bg-odoo-primary text-white rounded-2xl shadow-xl shadow-odoo-primary/20">
            <Users size={32}/>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Gestión de Staff</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
               <ShieldCheck size={14} className="text-emerald-500"/> Planificación de Turnos San José
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 z-10">
           <button onClick={() => setView('roster')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'roster' ? 'bg-white text-odoo-primary shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Fichas de Personal</button>
           <button onClick={() => setView('global')} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'global' ? 'bg-white text-odoo-primary shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Auditoría de Turnos</button>
        </div>
      </div>

      {view === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {employees.map(emp => {
            const todayShift = getEmployeeStatus(emp.id);
            const theme = todayShift ? SHIFT_THEMES[todayShift.shift_type] : null;

            return (
              <div 
                key={emp.id} 
                className="bg-white border border-slate-200 rounded-[32px] p-8 hover:border-odoo-primary/40 transition-all shadow-sm group relative overflow-hidden flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl font-black text-odoo-primary mb-6 shadow-inner group-hover:bg-odoo-primary group-hover:text-white transition-all duration-300">
                  {emp.name.charAt(0)}
                </div>
                
                <h3 className="text-sm font-black text-slate-800 uppercase line-clamp-1 mb-1 tracking-tight">{emp.name}</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6">{emp.job_title || 'COLABORADOR'}</p>
                
                {/* Status Hoy */}
                <div className={`w-full p-4 rounded-2xl border transition-all ${
                  !todayShift ? 'bg-slate-50 border-slate-100 opacity-50' : 
                  theme?.bg + ' ' + theme?.border + ' ' + theme?.text
                }`}>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-50 block mb-1">Actividad Hoy</span>
                  {todayShift ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-1.5">
                         {theme?.icon}
                         <span className="text-[10px] font-black uppercase tracking-tighter">{theme?.label}</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold uppercase opacity-30 italic">Sin Turno</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 w-full mt-6">
                  <button onClick={() => setViewCalendarEmp(emp)} className="bg-white text-slate-600 py-3 rounded-xl text-[9px] font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                     <Calendar size={12}/> Calendario
                  </button>
                  {isAdmin && (
                    <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="bg-odoo-primary text-white py-3 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-odoo-primary/10 hover:scale-[1.02] transition-all">
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
           <div className="px-10 py-6 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <Clock size={24} className="text-odoo-primary"/>
                 <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest">Consolidado General</h3>
              </div>
              {isAdmin && <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-4 px-8 rounded-2xl text-[10px] font-black uppercase flex items-center gap-3 shadow-lg shadow-odoo-primary/20 hover:scale-[1.02] transition-all"><Plus size={18}/> Nueva Programación</button>}
           </div>
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-10 py-6">Colaborador</th>
                      <th className="px-10 py-6">Sede</th>
                      <th className="px-10 py-6">Fecha</th>
                      <th className="px-10 py-6 text-center">Turno</th>
                      <th className="px-10 py-6 text-right">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {shifts.map(shift => {
                       const theme = SHIFT_THEMES[shift.shift_type];
                       return (
                        <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-10 py-5 font-black text-slate-800 uppercase text-[11px]">{shift.employee_name}</td>
                           <td className="px-10 py-5 font-bold text-slate-500 uppercase text-[10px]">{shift.pos_name}</td>
                           <td className="px-10 py-5 font-bold text-slate-600 uppercase text-[10px]">
                              {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {day: '2-digit', month: 'short'})}
                           </td>
                           <td className="px-10 py-5 text-center">
                              <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase border ${theme?.bg} ${theme?.text} ${theme?.border}`}>
                                 {theme?.label}
                              </span>
                           </td>
                           <td className="px-10 py-5 text-right">{isAdmin && <button onClick={() => { if(confirm("¿Eliminar turno?")) shiftService.deleteShift(shift.id).then(loadShifts); }} className="p-2 text-slate-200 hover:text-red-500 transition-all"><X size={18}/></button>}</td>
                        </tr>
                       );
                    })}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {/* VISTA CALENDARIO INDIVIDUAL */}
      {viewCalendarEmp && (
        <EmployeeCalendar 
          employee={viewCalendarEmp} 
          shifts={shifts.filter(s => s.employee_id === viewCalendarEmp.id)} 
          onClose={() => setViewCalendarEmp(null)} 
        />
      )}

      {/* MODAL DE PROGRAMACIÓN */}
      {showAddShift && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xl animate-fade">
           <form 
            onSubmit={handleAddShiftRange} 
            className="relative w-full max-w-[500px] bg-white rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
           >
              <div className="px-10 py-8 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-odoo-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-odoo-primary/20"><CalendarDays size={24}/></div>
                    <div>
                      <h3 className="text-xl font-black uppercase text-slate-800 tracking-tight">Programar Rango</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Asignación de Turnos</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-all"><X size={24}/></button>
              </div>
              
              <div className="p-10 space-y-6 bg-white overflow-y-auto custom-scrollbar max-h-[65vh]">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Colaborador</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none">
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                       <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                       <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Turno Base</label>
                      <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-[10px] font-black uppercase text-slate-700 outline-none cursor-pointer">
                         <option value="mañana">☀ MAÑANA</option>
                         <option value="tarde">🌆 TARDE</option>
                         <option value="completo">⚡ FULL DAY</option>
                         <option value="noche">🌙 NOCHE</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sede</label>
                      <select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-[10px] font-black uppercase text-slate-700 outline-none cursor-pointer">
                         {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora Entrada</label>
                       <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none" defaultValue="08:00"/>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hora Salida</label>
                       <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-xs font-black text-slate-700 outline-none" defaultValue="14:00"/>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-100">
                    <label className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                       <Coffee size={16} className="text-emerald-500"/> Definir Descansos
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                            key={day.value} 
                            type="button" 
                            onClick={() => toggleRestDay(day.value)} 
                            className={`relative py-4 rounded-xl text-[9px] font-black uppercase transition-all border flex flex-col items-center justify-center gap-1 ${
                              restDays.includes(day.value) 
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-200 scale-95' 
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

              <div className="px-10 py-8 bg-slate-50 border-t">
                 <button 
                  type="submit" 
                  disabled={dbLoading} 
                  className="w-full bg-odoo-primary text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-odoo-primary/20 flex items-center justify-center gap-4 hover:bg-[#5e3e55] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {dbLoading ? <RefreshCw size={24} className="animate-spin"/> : <Check size={24}/>}
                    <span>{dbLoading ? 'Guardando...' : 'Publicar Horarios'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
