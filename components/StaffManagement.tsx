
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Clock, Plus, X, RefreshCw, 
  ChevronLeft, ChevronRight, CalendarDays, Check, 
  MapPin, User, MoreHorizontal, Info, Sun, Moon, Zap, Coffee,
  ShieldCheck
} from 'lucide-react';
import { Employee, PosConfig, Shift } from '../types';
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

// Temas de Color Profesionales (Diseño de Alta Legibilidad y Semántica Operativa)
const SHIFT_THEMES: Record<string, { bg: string, text: string, border: string, icon: any, label: string, badge: string }> = {
  'mañana': { 
    bg: 'bg-amber-50', 
    text: 'text-amber-700', 
    border: 'border-amber-200', 
    icon: <Sun size={12} />,
    label: 'TURNO MAÑANA',
    badge: 'bg-amber-500'
  },
  'tarde': { 
    bg: 'bg-indigo-50', 
    text: 'text-indigo-700', 
    border: 'border-indigo-200', 
    icon: <Moon size={12} />,
    label: 'TURNO TARDE',
    badge: 'bg-indigo-500'
  },
  'completo': { 
    bg: 'bg-purple-50', 
    text: 'text-purple-700', 
    border: 'border-purple-200', 
    icon: <Zap size={12} />,
    label: 'FULL DAY',
    badge: 'bg-purple-500'
  },
  'noche': { 
    bg: 'bg-slate-900', 
    text: 'text-white', 
    border: 'border-slate-700', 
    icon: <Moon size={12} />,
    label: 'NOCTURNO',
    badge: 'bg-slate-700'
  },
  'descanso': { 
    bg: 'bg-emerald-50', 
    text: 'text-emerald-700', 
    border: 'border-emerald-300', 
    icon: <Coffee size={12} />,
    label: 'DESCANSO',
    badge: 'bg-emerald-500'
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
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-6xl bg-[#f8fafc] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        
        {/* Header de Ficha Profesional con Leyenda */}
        <div className="bg-white px-10 py-8 border-b flex flex-col gap-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-odoo-primary to-[#5e3e55] rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-odoo-primary/20">
                {employee.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{employee.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-[0.3em] flex items-center gap-2">
                  <Calendar size={12} className="text-odoo-primary"/> Cronograma Detallado de Actividades
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-4 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all text-slate-300">
              <X size={28}/>
            </button>
          </div>

          {/* Nueva Barra de Leyenda para el Usuario */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-50">
            <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
              <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month - 1, 1))} className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-odoo-primary"><ChevronLeft size={20}/></button>
              <h4 className="text-xs font-black text-slate-700 uppercase min-w-[200px] text-center tracking-widest">{monthName}</h4>
              <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month + 1, 1))} className="p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-odoo-primary"><ChevronRight size={20}/></button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-3">
              {Object.entries(SHIFT_THEMES).map(([key, theme]) => (
                <div key={key} className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${theme.bg} ${theme.border} ${theme.text} text-[9px] font-black uppercase tracking-tighter shadow-sm`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${theme.badge} shadow-sm`}></span>
                  {theme.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grid Principal del Calendario - Diseño Superior */}
        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-7 gap-4">
            {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">{d}</div>
            ))}
            
            {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 min-h-[160px] opacity-40" />
            ))}

            {Array.from({ length: daysInMonth.days }).map((_, i) => {
              const day = i + 1;
              const shift = getShiftForDay(day);
              const isToday = new Date().toDateString() === new Date(daysInMonth.year, daysInMonth.month, day).toDateString();
              const theme = shift ? SHIFT_THEMES[shift.shift_type] : null;

              return (
                <div 
                  key={day} 
                  className={`relative min-h-[160px] bg-white rounded-[40px] p-5 border transition-all flex flex-col group ${
                    isToday ? 'ring-[6px] ring-odoo-primary/5 border-odoo-primary shadow-2xl' : 'border-slate-100 hover:border-slate-300 hover:shadow-xl'
                  } ${theme ? 'z-10' : 'z-0'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`text-sm font-black ${isToday ? 'text-odoo-primary' : 'text-slate-300'}`}>
                      {String(day).padStart(2, '0')}
                    </span>
                    {isToday && (
                      <div className="flex items-center gap-2">
                         <span className="text-[8px] font-black text-odoo-primary uppercase">ACTUAL</span>
                         <div className="w-2 h-2 rounded-full bg-odoo-primary animate-ping"></div>
                      </div>
                    )}
                  </div>

                  {shift ? (
                    <div className={`mt-auto p-4 rounded-[28px] border transition-all animate-fade shadow-sm hover:scale-[1.02] ${theme?.bg} ${theme?.border} ${theme?.text}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded-xl ${shift.shift_type === 'noche' ? 'bg-white/10' : 'bg-white/80 shadow-inner'}`}>
                          {theme?.icon}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-tight">{theme?.label}</span>
                      </div>
                      
                      {shift.shift_type !== 'descanso' ? (
                        <div className="space-y-1.5">
                           <div className="flex items-center gap-2 text-[11px] font-black">
                             <Clock size={12}/> {shift.start_time.slice(0,5)} - {shift.end_time.slice(0,5)}
                           </div>
                           <div className="flex items-center gap-2 text-[9px] font-bold opacity-75 uppercase truncate">
                             <MapPin size={11}/> {shift.pos_name}
                           </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                           <div className="text-[9px] font-black uppercase tracking-[0.1em] opacity-80">Jornada Libre</div>
                           <div className="w-full h-1 bg-emerald-500/20 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 w-full"></div>
                           </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-auto py-4 text-center border-t border-slate-50 group-hover:border-slate-200 transition-colors">
                       <p className="text-[9px] font-black text-slate-200 uppercase tracking-[0.2em] group-hover:text-slate-300">Pendiente</p>
                    </div>
                  )}
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
    <div className="max-w-[1400px] mx-auto space-y-10 animate-fade pb-32">
      
      {/* Dashboard Header Corporativo */}
      <div className="bg-white p-10 border border-slate-200 rounded-[60px] shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
           <Users size={240}/>
        </div>
        
        <div className="flex items-center gap-8 z-10">
          <div className="p-7 bg-odoo-primary text-white rounded-[40px] shadow-2xl shadow-odoo-primary/20">
            <Users size={48}/>
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter leading-none">EQUIPO SAN JOSÉ</h2>
            <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-3 flex items-center gap-3">
               <ShieldCheck size={16} className="text-emerald-500"/> Centro de Control de Asistencias
            </p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-2 rounded-[32px] border border-slate-200 z-10">
           <button onClick={() => setView('roster')} className={`px-12 py-5 rounded-[26px] text-[12px] font-black uppercase tracking-widest transition-all ${view === 'roster' ? 'bg-white text-odoo-primary shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Fichas de Personal</button>
           <button onClick={() => setView('global')} className={`px-12 py-5 rounded-[26px] text-[12px] font-black uppercase tracking-widest transition-all ${view === 'global' ? 'bg-white text-odoo-primary shadow-xl shadow-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>Auditoría de Turnos</button>
        </div>
      </div>

      {view === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {employees.map(emp => {
            const todayShift = getEmployeeStatus(emp.id);
            const theme = todayShift ? SHIFT_THEMES[todayShift.shift_type] : null;

            return (
              <div 
                key={emp.id} 
                className="bg-white border border-slate-200 rounded-[56px] p-10 hover:border-odoo-primary/40 transition-all shadow-sm hover:shadow-2xl hover:-translate-y-2 group relative overflow-hidden flex flex-col items-center text-center"
              >
                <div className="w-32 h-32 bg-slate-50 rounded-[48px] flex items-center justify-center text-4xl font-black text-odoo-primary mb-8 shadow-inner group-hover:bg-odoo-primary group-hover:text-white transition-all duration-500">
                  {emp.name.charAt(0)}
                </div>
                
                <h3 className="text-base font-black text-slate-800 uppercase line-clamp-1 mb-1 tracking-tight">{emp.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">{emp.job_title || 'COLABORADOR'}</p>
                
                {/* Status Badge Profesional */}
                <div className={`w-full p-6 rounded-[36px] border transition-all ${
                  !todayShift ? 'bg-slate-50 border-slate-100 opacity-50' : 
                  theme?.bg + ' ' + theme?.border + ' ' + theme?.text
                }`}>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-50 block mb-2">Actividad de Hoy</span>
                  {todayShift ? (
                    <div className="flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-1">
                         {theme?.icon}
                         <span className="text-xs font-black uppercase tracking-tighter">{theme?.label}</span>
                      </div>
                      {todayShift.shift_type !== 'descanso' && (
                        <span className="text-[11px] font-black mt-1">{todayShift.start_time.slice(0,5)} - {todayShift.end_time.slice(0,5)}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold uppercase opacity-20 italic">No Programado</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mt-10">
                  <button onClick={() => setViewCalendarEmp(emp)} className="bg-white text-slate-600 py-5 rounded-[24px] text-[10px] font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                     <Calendar size={14}/> Ver Mes
                  </button>
                  {isAdmin && (
                    <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="bg-odoo-primary text-white py-5 rounded-[24px] text-[10px] font-black uppercase shadow-lg shadow-odoo-primary/10 hover:scale-[1.05] transition-all">
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
        <div className="bg-white border border-slate-200 rounded-[64px] overflow-hidden shadow-sm">
           <div className="px-14 py-10 border-b bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-5">
                 <Clock size={32} className="text-odoo-primary"/>
                 <div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-[0.4em] leading-none">Monitor de Turnos</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Consolidado General de la Cadena</p>
                 </div>
              </div>
              {isAdmin && <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-5 px-10 rounded-[28px] text-[11px] font-black uppercase flex items-center gap-4 shadow-2xl shadow-odoo-primary/30 hover:scale-105 transition-all"><Plus size={24}/> Nueva Programación</button>}
           </div>
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-14 py-8">Colaborador</th>
                      <th className="px-14 py-8">Sede Asignada</th>
                      <th className="px-14 py-8">Fecha</th>
                      <th className="px-14 py-8 text-center">Tipo de Turno</th>
                      <th className="px-14 py-8 text-right">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {shifts.map(shift => {
                       const theme = SHIFT_THEMES[shift.shift_type];
                       return (
                        <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-14 py-6 font-black text-slate-800 uppercase text-xs">{shift.employee_name}</td>
                           <td className="px-14 py-6 font-bold text-slate-500 uppercase text-[11px]">{shift.pos_name}</td>
                           <td className="px-14 py-6 font-bold text-slate-600 uppercase text-[11px]">
                              {new Date(shift.date + 'T00:00:00').toLocaleDateString('es-PE', {day: '2-digit', month: 'long', year: 'numeric'})}
                           </td>
                           <td className="px-14 py-6 text-center">
                              <span className={`text-[10px] font-black px-5 py-2 rounded-full uppercase border ${theme?.bg} ${theme?.text} ${theme?.border}`}>
                                 {theme?.label}
                              </span>
                           </td>
                           <td className="px-14 py-6 text-right">{isAdmin && <button onClick={() => { if(confirm("¿Eliminar turno?")) shiftService.deleteShift(shift.id).then(loadShifts); }} className="p-4 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><X size={20}/></button>}</td>
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
            className="relative w-full max-w-[580px] bg-white rounded-[64px] shadow-2xl flex flex-col overflow-hidden"
           >
              <div className="px-12 py-12 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-odoo-primary rounded-[30px] flex items-center justify-center text-white shadow-2xl shadow-odoo-primary/30"><CalendarDays size={32}/></div>
                    <div>
                      <h3 className="text-3xl font-black uppercase text-slate-800 tracking-tighter leading-none">Nueva Ficha</h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase mt-2 tracking-[0.4em]">Asignación de Responsabilidades</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-16 h-16 flex items-center justify-center bg-white rounded-[24px] shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-all"><X size={32}/></button>
              </div>
              
              <div className="p-12 space-y-8 bg-white overflow-y-auto custom-scrollbar max-h-[70vh]">
                 <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Colaborador Principal</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-[28px] px-8 py-5 text-sm font-black text-slate-700 outline-none focus:ring-[8px] focus:ring-odoo-primary/5 transition-all appearance-none cursor-pointer">
                       {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Rango desde</label>
                       <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-[28px] px-8 py-5 text-sm font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Hasta</label>
                       <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-[28px] px-8 py-5 text-sm font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Turno Operativo</label>
                      <select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-[28px] px-8 py-5 text-[11px] font-black uppercase text-slate-700 outline-none cursor-pointer">
                         <option value="mañana">☀ TURNO MAÑANA</option>
                         <option value="tarde">🌆 TURNO TARDE</option>
                         <option value="completo">⚡ JORNADA COMPLETA</option>
                         <option value="noche">🌙 TURNO NOCHE</option>
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Sede / Botica</label>
                      <select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-[28px] px-8 py-5 text-[11px] font-black uppercase text-slate-700 outline-none cursor-pointer">
                         {posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-4">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Hora Entrada</label>
                       <input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-[28px] px-8 py-5 text-sm font-black text-slate-700 outline-none" defaultValue="08:00"/>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Hora Salida</label>
                       <input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-[28px] px-8 py-5 text-sm font-black text-slate-700 outline-none" defaultValue="14:00"/>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-100">
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-[0.4em] flex items-center gap-4 mb-8">
                       <Coffee size={18} className="text-emerald-500"/> Definir Descansos Semanales
                    </label>
                    <div className="grid grid-cols-7 gap-4">
                       {DAYS_OF_WEEK.map(day => (
                         <button 
                            key={day.value} 
                            type="button" 
                            onClick={() => toggleRestDay(day.value)} 
                            className={`relative py-6 rounded-[30px] text-[10px] font-black uppercase transition-all border flex flex-col items-center justify-center gap-2 ${
                              restDays.includes(day.value) 
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-2xl shadow-emerald-200 scale-95' 
                              : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'
                            }`}
                         >
                           {day.label}
                           {restDays.includes(day.value) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <div className="px-12 py-10 bg-slate-50 border-t">
                 <button 
                  type="submit" 
                  disabled={dbLoading} 
                  className="w-full bg-odoo-primary text-white py-7 rounded-[36px] font-black uppercase text-[13px] tracking-[0.3em] shadow-2xl shadow-odoo-primary/30 flex items-center justify-center gap-6 hover:bg-[#5e3e55] active:scale-[0.98] transition-all disabled:opacity-50"
                 >
                    {dbLoading ? <RefreshCw size={28} className="animate-spin"/> : <Check size={28}/>}
                    <span>{dbLoading ? 'Sincronizando...' : 'Publicar Cronograma'}</span>
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
