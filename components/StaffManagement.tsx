
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Calendar, Clock, Plus, X, RefreshCw, 
  ChevronLeft, ChevronRight, CalendarDays, Check, 
  MapPin, Sun, Moon, Zap, Coffee,
  ShieldCheck, Briefcase, Info, ArrowRight, Eye, Trash2
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
  onClose,
  isFullView = false,
  isAdmin = false,
  onRefresh
}: { 
  employee: Employee; 
  shifts: Shift[]; 
  onClose?: () => void;
  isFullView?: boolean;
  isAdmin?: boolean;
  onRefresh?: () => void;
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

  const handleDeleteShift = async (id: string) => {
    if (!isAdmin) return;
    if (confirm("¿Estás seguro de eliminar este turno específico?")) {
      try {
        await shiftService.deleteShift(id);
        if (onRefresh) onRefresh();
      } catch (e) {
        alert("Error al eliminar");
      }
    }
  };

  const calendarContent = (
    <div className={`bg-white h-full shadow-2xl flex flex-col ${!isFullView ? 'relative w-full max-w-4xl animate-in slide-in-from-right duration-500' : 'rounded-[40px] border border-slate-200 shadow-sm'}`}>
        <div className="bg-white px-8 py-6 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-odoo-primary rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-odoo-primary/20">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">{employee.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <CalendarDays size={14}/> Cronograma Operativo {isFullView ? 'Personal' : 'Individual'}
              </p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <X size={28}/>
            </button>
          )}
        </div>

        <div className="px-8 py-4 bg-slate-50 border-b flex flex-wrap justify-between items-center gap-6 shrink-0">
          <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month - 1, 1))} className="text-slate-400 hover:text-odoo-primary p-1"><ChevronLeft size={20}/></button>
            <h4 className="text-[11px] font-black text-slate-700 uppercase min-w-[180px] text-center tracking-[0.2em]">{monthName}</h4>
            <button onClick={() => setCurrentDate(new Date(daysInMonth.year, daysInMonth.month + 1, 1))} className="text-slate-400 hover:text-odoo-primary p-1"><ChevronRight size={20}/></button>
          </div>
          <div className="flex gap-8">
             <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-lg bg-emerald-600 border border-emerald-700 shadow-sm"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">TRABAJO</span>
             </div>
             <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-lg bg-slate-400 border border-slate-500 shadow-sm"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">DESCANSO</span>
             </div>
          </div>
        </div>

        <div className="flex-1 p-8 bg-slate-100/50 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-7 gap-3 max-w-4xl mx-auto">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
              <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] pb-4">{d}</div>
            ))}
            {Array.from({ length: daysInMonth.firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square bg-slate-200/20 rounded-[24px] border border-slate-200/50" />
            ))}
            {Array.from({ length: daysInMonth.days }).map((_, i) => {
              const day = i + 1;
              const shift = getShiftForDay(day);
              const isToday = new Date().toDateString() === new Date(daysInMonth.year, daysInMonth.month, day).toDateString();
              const isWork = shift && shift.shift_type !== 'descanso';
              const isRest = shift && shift.shift_type === 'descanso';
              
              return (
                <div key={day} className={`relative aspect-square rounded-[24px] p-3 border-2 transition-all flex flex-col items-center justify-center text-center overflow-hidden shadow-sm group ${isWork ? 'bg-emerald-600 border-emerald-700 text-white' : isRest ? 'bg-slate-400 border-slate-500 text-white' : 'bg-white border-slate-200 text-slate-300 border-dashed'} ${isToday ? 'ring-4 ring-odoo-primary/40 scale-[1.05] z-10 shadow-xl' : ''}`}>
                  <div className="absolute top-2 left-3">
                    <span className={`text-xs font-black ${isWork || isRest ? 'text-white/60' : (isToday ? 'text-odoo-primary' : 'text-slate-300')}`}>{day}</span>
                  </div>
                  
                  {isAdmin && shift && (
                    <button 
                      onClick={() => handleDeleteShift(shift.id)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}

                  {shift ? (
                    <div className="flex flex-col items-center w-full">
                      <span className="text-[10px] font-black uppercase tracking-[0.1em]">{isRest ? 'DESC.' : 'TRAB.'}</span>
                      {isWork && (
                        <div className="mt-1.5 flex flex-col items-center pt-1.5 border-t border-white/20 w-full">
                           <div className="flex items-center gap-1 text-[11px] font-black leading-none">
                             {shift.start_time.slice(0,5)}
                           </div>
                           <p className="text-[8px] font-bold uppercase opacity-80 mt-1 truncate max-w-full px-1">{shift.pos_name}</p>
                        </div>
                      )}
                      {isRest && <div className="mt-1 opacity-30"><Coffee size={18} /></div>}
                    </div>
                  ) : (
                    <span className="text-[9px] font-black opacity-10">LIBRE</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );

  if (isFullView) return calendarContent;

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-end animate-fade">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      {calendarContent}
    </div>
  );
};

export const StaffManagement: React.FC<{isAdmin: boolean; employees: Employee[]; posConfigs: any[]; currentUserEmail?: string; loading: boolean;}> = ({ isAdmin, employees, posConfigs, currentUserEmail, loading: odooLoading }) => {
  const [view, setView] = useState<'roster' | 'global' | 'me'>(isAdmin ? 'roster' : 'me');
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
    } catch (e) { console.error(e); } finally { setDbLoading(false); }
  };

  useEffect(() => { loadShifts(); }, [isAdmin, currentUserEmail]);

  const me = useMemo(() => {
    if (isAdmin) return null;
    return employees.find(e => e.work_email?.toLowerCase().trim() === currentUserEmail?.toLowerCase().trim());
  }, [employees, currentUserEmail, isAdmin]);

  const staffSummary = useMemo(() => {
    if (!isAdmin) return [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return employees.map(emp => {
      const empShifts = shifts.filter(s => Number(s.employee_id) === Number(emp.id));
      const today = new Date().toISOString().split('T')[0];
      const todayShift = empShifts.find(s => s.date === today);
      
      const monthShifts = empShifts.filter(s => {
        const d = new Date(s.date + 'T00:00:00');
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      return {
        employee: emp,
        todayLocation: todayShift ? todayShift.pos_name : 'No Programado',
        todayType: todayShift ? todayShift.shift_type : '-',
        workDays: monthShifts.filter(s => s.shift_type !== 'descanso').length,
        restDays: monthShifts.filter(s => s.shift_type === 'descanso').length,
        total: monthShifts.length
      };
    }).sort((a, b) => b.total - a.total);
  }, [employees, shifts, isAdmin]);

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
      await loadShifts();
    } catch (e: any) { alert(e.message); } finally { setDbLoading(false); }
  };

  // --- VISTA EMPLEADO: Privacidad Estricta ---
  if (!isAdmin) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-32">
        <div className="bg-white p-10 border border-slate-200 rounded-[40px] shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-80 h-80 bg-odoo-primary/5 rounded-full blur-[100px] -mr-20 -mt-20"></div>
           <div className="flex items-center gap-8 z-10">
              <div className="w-20 h-20 bg-odoo-primary rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-odoo-primary/30">
                <ShieldCheck size={40}/>
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Mi Horario Personal</h2>
                <div className="flex items-center gap-3 mt-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Operativo San José Online</p>
                </div>
              </div>
           </div>
           <button onClick={loadShifts} className="px-8 py-4 bg-slate-100 rounded-2xl text-[11px] font-black uppercase text-slate-500 hover:text-odoo-primary transition-all flex items-center gap-3 border border-slate-200 z-10">
             <RefreshCw size={18} className={dbLoading ? 'animate-spin' : ''}/> Sincronizar Calendario
           </button>
        </div>

        {me ? (
          <div className="h-[80vh]">
            <EmployeeCalendar employee={me} shifts={shifts} isFullView />
          </div>
        ) : (
          <div className="bg-white p-32 rounded-[40px] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8"><Users size={64}/></div>
            <h3 className="text-xl font-black text-slate-300 uppercase tracking-widest mb-2">Usuario no Vinculado</h3>
            <p className="text-sm font-bold text-slate-400 max-w-md uppercase tracking-tight">Tu correo ({currentUserEmail}) no se encuentra en el padrón oficial de empleados. Contacta a Soporte.</p>
          </div>
        )}
      </div>
    );
  }

  // --- VISTA ADMINISTRADOR: Control Total ---
  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-fade pb-32">
      {/* Header Corporativo Admin */}
      <div className="bg-white p-10 border border-slate-200 rounded-[40px] shadow-sm flex flex-col lg:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-8">
          <div className="p-5 bg-odoo-primary text-white rounded-3xl shadow-2xl shadow-odoo-primary/20"><Users size={32}/></div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Administración de RRHH</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">
               <ShieldCheck size={16} className="text-emerald-500"/> Centro de Control San José
            </p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-2 rounded-[24px] border border-slate-200 shadow-inner">
           <button onClick={() => setView('roster')} className={`px-10 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'roster' ? 'bg-white text-odoo-primary shadow-lg border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Staff</button>
           <button onClick={() => setView('global')} className={`px-10 py-3.5 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${view === 'global' ? 'bg-white text-odoo-primary shadow-lg border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>Consolidado</button>
        </div>
      </div>

      {view === 'roster' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {employees.map(emp => {
            const today = new Date().toISOString().split('T')[0];
            const todayShift = shifts.find(s => Number(s.employee_id) === Number(emp.id) && s.date === today);
            const isWorking = todayShift && todayShift.shift_type !== 'descanso';
            return (
              <div key={emp.id} className="bg-white border border-slate-200 rounded-[40px] p-8 hover:border-odoo-primary/40 transition-all shadow-sm flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-2xl font-black text-odoo-primary mb-6 group-hover:bg-odoo-primary group-hover:text-white transition-all duration-300 shadow-inner">{emp.name.charAt(0)}</div>
                <h3 className="text-sm font-black text-slate-800 uppercase mb-2 tracking-tight line-clamp-1">{emp.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">{emp.job_title || 'COLABORADOR'}</p>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button onClick={() => setViewCalendarEmp(emp)} className="bg-slate-50 text-slate-600 py-3.5 rounded-2xl text-[10px] font-black uppercase border border-slate-100 hover:bg-white hover:shadow-sm transition-all flex items-center justify-center gap-2">
                     <Calendar size={14}/> Ver Mes
                  </button>
                  <button onClick={() => { setSelectedEmployee(emp); setShowAddShift(true); }} className="bg-odoo-primary text-white py-3.5 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-odoo-primary/10 hover:scale-[1.02] active:scale-95 transition-all">
                    Asignar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'global' && (
        <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
           <div className="px-12 py-8 border-b bg-slate-50/50 flex justify-between items-center">
              <div>
                 <h3 className="text-sm font-black text-slate-600 uppercase tracking-[0.2em] leading-none">Resumen Operativo Mensual</h3>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Carga de trabajo por colaborador</p>
              </div>
              <button onClick={() => { setSelectedEmployee(null); setShowAddShift(true); }} className="bg-odoo-primary text-white py-4 px-10 rounded-[20px] text-[11px] font-black uppercase flex items-center gap-4 shadow-xl shadow-odoo-primary/20 hover:scale-[1.03] transition-all"><Plus size={20}/> Programar Masivo</button>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">
                    <tr>
                      <th className="px-12 py-8">Colaborador</th>
                      <th className="px-12 py-8 text-center">Ubicación Actual</th>
                      <th className="px-12 py-8 text-center">Programación Mes</th>
                      <th className="px-12 py-8 text-right">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 bg-white">
                    {staffSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-12 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[12px] font-black text-odoo-primary group-hover:bg-odoo-primary group-hover:text-white transition-colors uppercase">{item.employee.name.charAt(0)}</div>
                            <div>
                               <p className="font-black text-slate-800 uppercase text-xs">{item.employee.name}</p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.employee.work_email || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-12 py-6 text-center">
                          <div className="flex flex-col items-center">
                             <span className="text-[11px] font-black text-slate-700 uppercase">{item.todayLocation}</span>
                             <span className={`text-[8px] font-black px-2 py-0.5 rounded-full mt-1 uppercase ${item.todayType === 'descanso' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                                {item.todayType}
                             </span>
                          </div>
                        </td>
                        <td className="px-12 py-6">
                          <div className="flex flex-col items-center gap-2">
                             <div className="flex justify-between w-full max-w-[150px] text-[9px] font-black text-slate-400 uppercase tracking-tight">
                               <span className="text-emerald-600">Trab: {item.workDays} d</span>
                               <span className="text-slate-400">Desc: {item.restDays} d</span>
                             </div>
                             <div className="w-full max-w-[150px] h-2 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                               <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${(item.workDays/30)*100}%` }}></div>
                               <div className="bg-slate-300 h-full transition-all duration-700" style={{ width: `${(item.restDays/30)*100}%` }}></div>
                             </div>
                          </div>
                        </td>
                        <td className="px-12 py-6 text-right">
                           <button onClick={() => setViewCalendarEmp(item.employee)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-odoo-primary hover:text-white transition-all flex items-center justify-center border border-slate-200">
                             <Eye size={20}/>
                           </button>
                        </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      )}

      {viewCalendarEmp && (
        <EmployeeCalendar 
          employee={viewCalendarEmp} 
          shifts={shifts.filter(s => Number(s.employee_id) === Number(viewCalendarEmp.id))} 
          onClose={() => setViewCalendarEmp(null)} 
          isAdmin={isAdmin}
          onRefresh={loadShifts}
        />
      )}

      {/* Modal de Asignación Masiva */}
      {showAddShift && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-fade">
           <form onSubmit={handleAddShiftRange} className="relative w-full max-w-[500px] bg-white rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-12 py-10 bg-slate-50 border-b flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-odoo-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-odoo-primary/30"><CalendarDays size={30}/></div>
                    <div><h3 className="text-2xl font-black uppercase text-slate-800 tracking-tighter leading-none">Programar Rol</h3><p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Carga inteligente de turnos</p></div>
                 </div>
                 <button type="button" onClick={() => setShowAddShift(false)} className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm text-slate-300 hover:text-red-500 border border-slate-100 transition-all active:scale-90"><X size={32}/></button>
              </div>
              <div className="p-12 space-y-8 bg-white overflow-y-auto custom-scrollbar max-h-[65vh]">
                 <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Colaborador Destino</label>
                    <select name="employee_id" defaultValue={selectedEmployee?.id} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4.5 text-xs font-black text-slate-700 outline-none focus:border-odoo-primary/40 focus:bg-white transition-all">{employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Fecha Inicio</label><input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Fecha Fin</label><input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black text-slate-700 outline-none" defaultValue={new Date().toISOString().split('T')[0]}/></div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tipo de Turno</label><select value={shiftType} onChange={(e) => setShiftType(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[11px] font-black uppercase text-slate-700 outline-none focus:border-odoo-primary/40 transition-all"><option value="mañana">☀ MAÑANA</option><option value="tarde">🌆 TARDE</option><option value="completo">⚡ FULL DAY</option><option value="noche">🌙 NOCHE</option></select></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Botica / Sede</label><select name="pos_id" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-[11px] font-black uppercase text-slate-700 outline-none">{posConfigs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                 </div>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">H. Entrada</label><input type="time" name="start" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black text-slate-700 outline-none" defaultValue="08:00"/></div>
                    <div className="space-y-3"><label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">H. Salida</label><input type="time" name="end" required className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black text-slate-700 outline-none" defaultValue="21:00"/></div>
                 </div>
                 <div className="pt-8 border-t border-slate-100">
                    <label className="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] flex items-center gap-3 mb-6"><Coffee size={20} className="text-emerald-500"/> Definir Descansos Semanales</label>
                    <div className="grid grid-cols-7 gap-2.5">{DAYS_OF_WEEK.map(day => (<button key={day.value} type="button" onClick={() => {setRestDays(prev => prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value]);}} className={`relative py-5 rounded-2xl text-[10px] font-black uppercase transition-all border flex flex-col items-center justify-center gap-2 ${restDays.includes(day.value) ? 'bg-emerald-600 text-white border-emerald-700 shadow-xl scale-95' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white hover:border-slate-300'}`}>{day.label}{restDays.includes(day.value) && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}</button>))}</div>
                 </div>
              </div>
              <div className="px-12 py-10 bg-slate-50 border-t">
                 <button type="submit" disabled={dbLoading} className="w-full bg-odoo-primary text-white py-6 rounded-[24px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-odoo-primary/30 flex items-center justify-center gap-5 active:scale-[0.97] transition-all disabled:opacity-50">{dbLoading ? <RefreshCw size={24} className="animate-spin"/> : <Check size={24}/>}<span>{dbLoading ? 'Procesando Programación...' : 'Publicar Horarios Oficiales'}</span></button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
