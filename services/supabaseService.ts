
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Configuración de Supabase - Boticas San José Hub
const SUPABASE_URL = "https://vwrugxpijvrlvehrtobr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3cnVneHBpanZybHZlaHJ0b2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjQyNTYsImV4cCI6MjA4Njg0MDI1Nn0.h5MCuqa8Mx0AdSVcYNDR43CX9V3GP_Bi-TCUTzk8nyU";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const shiftService = {
  async getShifts() {
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getMyShifts(email: string) {
    if (!email) return [];
    const { data, error } = await supabase
      .from('shifts')
      .select('*')
      .eq('employee_email', email.trim().toLowerCase())
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createShifts(shiftsData: any[]) {
    const payload = shiftsData.map(s => ({
      ...s,
      employee_email: s.employee_email?.toLowerCase().trim()
    }));
    
    const { data, error } = await supabase
      .from('shifts')
      .insert(payload)
      .select();
      
    if (error) throw error;
    return data;
  },

  async deleteShift(id: string) {
    const { error } = await supabase
      .from('shifts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};
