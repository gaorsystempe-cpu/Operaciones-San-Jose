
export type UserRole = 'superadmin' | 'admin' | 'employee';

export interface Company {
  id: number;
  name: string;
}

export interface Warehouse {
  id: number;
  name: string;
  code: string;
}

export interface Product {
  id: number;
  name: string;
  default_code?: string;
  barcode?: string;
  list_price: number;
  qty_available: number;
  sales_count?: number;
}

export interface Employee {
  id: number;
  name: string;
  job_title?: string;
  work_email?: string;
  work_phone?: string;
  department_id?: [number, string];
  resource_calendar_id?: [number, string];
}

export interface AppConfig {
  url: string;
  db: string;
  user: string;
  apiKey: string;
  companyName: string;
  selectedCompanyId?: number;
  defaultOriginWarehouseId?: number;
  defaultDestWarehouseId?: number;
}

export interface UserSession {
  id: number;
  name: string;
  role: UserRole;
  employee_id?: number;
  company_id?: number;
  company_name?: string;
}
