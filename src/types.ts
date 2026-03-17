export interface User {
  id: number;
  email: string;
  name: string;
  role: 'sender' | 'approver' | 'admin' | 'supervisor' | 'manager' | 'planner' | 'quality';
  supervisor_id?: number;
  supervisor_ids?: number[];
  department_id?: number;
  sub_department_id?: number;
  birth_date?: string;
  manager_id?: number;
  planner_id?: number;
  quality_id?: number;
  password?: string;
}

export interface Department {
  id: number;
  name: string;
  supervisor_id?: number;
  location?: string;
}

export interface SubDepartment {
  id: number;
  name: string;
  department_id: number;
}

export interface LeaveRequest {
  id: number;
  sender_id: number;
  sender_name?: string;
  department_name?: string;
  start_date: string;
  end_date: string;
  from_time?: string;
  to_time?: string;
  type: 'half' | 'full' | 'hours' | 'days';
  hours?: number;
  days?: number;
  reason_type: 'Medical' | 'Parenthood' | 'Others';
  reason: string;
  other_reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  sick_hours_requested?: boolean;
  vacation_hours_requested?: boolean;
  created_at: string;
}

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  is_read: number;
  created_at: string;
}
