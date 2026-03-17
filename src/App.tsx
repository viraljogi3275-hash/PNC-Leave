import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  LayoutDashboard, 
  FileText, 
  CheckCircle, 
  Users, 
  Bell, 
  LogOut, 
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  Menu,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Building2,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addMonths, getDaysInMonth, getDay } from 'date-fns';
import { cn } from './lib/utils';
import { User, LeaveRequest, Notification, Department, SubDepartment } from './types';

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    pending: "bg-amber-50 text-amber-600 border-amber-100",
    approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rejected: "bg-rose-50 text-rose-600 border-rose-100"
  };
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      styles[status as keyof typeof styles] || "bg-slate-50 text-slate-600 border-slate-100"
    )}>
      {status}
    </span>
  );
};

const Logo = () => (
  <div className="flex items-center gap-2">
    <svg width="120" height="40" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-auto">
      {/* Slanted background shape */}
      <path d="M0 35L15 5H120L105 35H0Z" fill="#D1D5DB" />
      
      {/* PNC Text - Bold and Italic style */}
      <text x="20" y="28" fill="#000066" style={{ font: 'bold italic 24px Arial, sans-serif' }}>PNC</text>
      
      {/* Circuit lines on P */}
      <line x1="18" y1="15" x2="30" y2="15" stroke="white" strokeWidth="1" />
      <circle cx="18" cy="15" r="1" fill="white" />
      <line x1="18" y1="18" x2="28" y2="18" stroke="white" strokeWidth="1" />
      <circle cx="18" cy="18" r="1" fill="white" />
      <line x1="18" y1="21" x2="26" y2="21" stroke="white" strokeWidth="1" />
      <circle cx="18" cy="21" r="1" fill="white" />

      {/* Circuit lines on C */}
      <line x1="75" y1="18" x2="87" y2="18" stroke="white" strokeWidth="1" />
      <circle cx="87" cy="18" r="1" fill="white" />
      <line x1="77" y1="21" x2="87" y2="21" stroke="white" strokeWidth="1" />
      <circle cx="87" cy="21" r="1" fill="white" />
      <line x1="79" y1="24" x2="87" y2="24" stroke="white" strokeWidth="1" />
      <circle cx="87" cy="24" r="1" fill="white" />
    </svg>
    <span className="font-bold text-xl tracking-tight text-[#003366] hidden sm:inline ml-1">Leave Management</span>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isVerifying, setIsVerifying] = useState(true);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pnc_user');
    socket?.disconnect();
    setIsVerifying(false);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('pnc_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      // Verify user still exists
      fetch(`/api/users?t=${Date.now()}`)
        .then(res => {
          if (!res.ok) throw new Error('Server error');
          return res.json();
        })
        .then(users => {
          const exists = users.find((user: any) => user.id === u.id);
          if (exists) {
            setUser(u);
            initSocket(u.id);
          } else {
            handleLogout();
          }
        })
        .catch((err) => {
          console.error("Session verification failed:", err);
          // Fallback to local data if server is temporarily down
          setUser(u);
          initSocket(u.id);
        })
        .finally(() => {
          setIsVerifying(false);
        });
    } else {
      setIsVerifying(false);
    }
  }, []);

  const initSocket = (userId: number) => {
    const s = io();
    s.emit('join', userId);
    s.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });
    setSocket(s);
    fetchNotifications(userId);
  };

  const fetchNotifications = async (userId: number) => {
    const res = await fetch(`/api/notifications/${userId}?t=${Date.now()}`);
    const data = await res.json();
    setNotifications(data);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.ok) {
        const u = await res.json();
        setUser(u);
        localStorage.setItem('pnc_user', JSON.stringify(u));
        initSocket(u.id);
      } else {
        const data = await res.json();
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const markNotificationsRead = async () => {
    if (!user) return;
    await fetch('/api/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100"
        >
          <div className="flex flex-col items-center mb-8">
            <Logo />
            <h1 className="text-2xl font-bold text-slate-800 mt-6">Welcome Back</h1>
            <p className="text-slate-500 text-sm mt-2">Sign in to manage your leaves</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="name@pnc.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-blue-200"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-0 hidden md:block"
      )}>
        <div className="h-full flex flex-col p-4">
          <div className="mb-8 px-2">
            <Logo />
          </div>

          <nav className="flex-1 space-y-1">
            <NavItem 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
            />
            <NavItem 
              icon={<Plus size={20} />} 
              label="Apply Leave" 
              active={activeTab === 'apply'} 
              onClick={() => { setActiveTab('apply'); setIsSidebarOpen(false); }} 
            />
            <NavItem 
              icon={<FileText size={20} />} 
              label="Leave History" 
              active={activeTab === 'history'} 
              onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }} 
            />
            {(user.role === 'admin' || user.role === 'approver') && (
              <>
                <NavItem 
                  icon={<Building2 size={20} />} 
                  label="Departments" 
                  active={activeTab === 'departments'} 
                  onClick={() => { setActiveTab('departments'); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Layers size={20} />} 
                  label="Sub-Departments" 
                  active={activeTab === 'sub-departments'} 
                  onClick={() => { setActiveTab('sub-departments'); setIsSidebarOpen(false); }} 
                />
                <NavItem 
                  icon={<Users size={20} />} 
                  label="User Management" 
                  active={activeTab === 'users'} 
                  onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} 
                />
              </>
            )}
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-bottom border-slate-200 px-4 flex items-center justify-between sticky top-0 z-40">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-600 md:hidden"
          >
            <Menu size={24} />
          </button>

          <h2 className="text-lg font-bold text-slate-800 md:ml-0 ml-2 capitalize">
            {activeTab.replace('-', ' ')}
          </h2>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) markNotificationsRead();
                }}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors relative"
              >
                <Bell size={22} />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)}
                    ></div>
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Notifications</h3>
                        <button className="text-xs text-blue-600 font-semibold">Clear All</button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div key={n.id} className={cn("p-4 border-b border-slate-50 last:border-0", !n.is_read && "bg-blue-50/50")}>
                              <p className="text-sm text-slate-700">{n.message}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-8 text-center text-slate-400">
                            <Bell size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No notifications yet</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard user={user} setActiveTab={setActiveTab} />}
              {activeTab === 'apply' && <ApplyLeave user={user} onSuccess={() => setActiveTab('history')} />}
              {activeTab === 'history' && <LeaveHistory user={user} />}
              {activeTab === 'departments' && (user.role === 'admin' || user.role === 'approver') && <DepartmentManagement />}
              {activeTab === 'sub-departments' && (user.role === 'admin' || user.role === 'approver') && <SubDepartmentManagement />}
              {activeTab === 'users' && (user.role === 'admin' || user.role === 'approver') && <UserManagement />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- Sub-components ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
          : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <span className={cn("transition-colors", active ? "text-white" : "text-slate-400 group-hover:text-slate-600")}>
        {icon}
      </span>
      <span className="font-semibold text-sm">{label}</span>
      {active && <ChevronRight size={16} className="ml-auto opacity-50" />}
    </button>
  );
}

function Dashboard({ user, setActiveTab }: { user: User, setActiveTab: (t: string) => void }) {
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const res = await fetch(`/api/leaves?userId=${user.id}&role=${user.role}&t=${Date.now()}`);
    const leaves: LeaveRequest[] = await res.json();
    setStats({
      pending: leaves.filter(l => l.status === 'pending').length,
      approved: leaves.filter(l => l.status === 'approved').length,
      rejected: leaves.filter(l => l.status === 'rejected').length,
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard 
          icon={<Clock className="text-amber-500" />} 
          label="Pending Requests" 
          value={stats.pending} 
          color="amber" 
        />
        <StatCard 
          icon={<CheckCircle className="text-emerald-500" />} 
          label="Approved" 
          value={stats.approved} 
          color="emerald" 
        />
        <StatCard 
          icon={<AlertCircle className="text-rose-500" />} 
          label="Rejected" 
          value={stats.rejected} 
          color="rose" 
        />
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => setActiveTab('apply')}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
          >
            <Plus size={20} />
            Apply for Leave
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all"
          >
            <FileText size={20} />
            View History
          </button>
        </div>
      </div>

      {['sender', 'supervisor', 'manager', 'planner', 'quality', 'admin', 'approver'].includes(user.role) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">Leave Calendar</h3>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span className="text-slate-500">Pending</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-slate-500">Approved</span>
              </div>
            </div>
          </div>
          <CalendarView user={user} />
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
  const colors: any = {
    amber: "bg-amber-50 border-amber-100",
    emerald: "bg-emerald-50 border-emerald-100",
    rose: "bg-rose-50 border-rose-100",
    blue: "bg-blue-50 border-blue-100",
  };

  return (
    <div className={cn("p-4 rounded-xl border flex items-center gap-3 transition-transform hover:scale-[1.02]", colors[color])}>
      <div className="p-2 bg-white rounded-lg shadow-sm">
        {React.cloneElement(icon as React.ReactElement, { size: 18 })}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function ApplyLeave({ user, onSuccess }: { user: User, onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mode, setMode] = useState<'hours' | 'days' | null>(null);
  const [formData, setFormData] = useState({
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    from_time: '09:00',
    to_time: '17:00',
    type: 'full' as 'full' | 'half' | 'hours',
    hours: 8,
    days: 1,
    reason_type: 'Medical' as 'Medical' | 'Parenthood' | 'Others',
    other_reason: '',
    reason: '',
    sick_hours_requested: false,
    vacation_hours_requested: false
  });

  const calculateHours = (from: string, to: string) => {
    const [h1, m1] = from.split(':').map(Number);
    const [h2, m2] = to.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  };

  const calculateDays = (start: string, end: string) => {
    let count = 0;
    let cur = new Date(start);
    const last = new Date(end);
    while (cur <= last) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  useEffect(() => {
    if (mode === 'hours') {
      const h = calculateHours(formData.from_time, formData.to_time);
      setFormData(prev => ({ ...prev, hours: h }));
    } else if (mode === 'days') {
      const d = calculateDays(formData.start_date, formData.end_date);
      setFormData(prev => ({ ...prev, days: d }));
    }
  }, [formData.from_time, formData.to_time, formData.start_date, formData.end_date, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    const finalReason = formData.reason_type === 'Others' ? formData.other_reason : formData.reason_type;

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sender_id: user.id,
          type: mode,
          reason: finalReason
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit leave request');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!mode) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <h2 className="text-3xl font-bold text-slate-800 mb-8 text-center">Apply for Leave</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <button 
            onClick={() => setMode('hours')}
            className="p-8 bg-white rounded-3xl border-2 border-slate-100 hover:border-blue-500 hover:shadow-xl transition-all group text-center"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Clock size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Apply for Hours</h3>
            <p className="text-sm text-slate-500">Short leave for medical or personal work</p>
          </button>
          <button 
            onClick={() => setMode('days')}
            className="p-8 bg-white rounded-3xl border-2 border-slate-100 hover:border-emerald-500 hover:shadow-xl transition-all group text-center"
          >
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4 group-hover:scale-110 transition-transform">
              <Calendar size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Apply for Days</h3>
            <p className="text-sm text-slate-500">Longer leave for vacation or parenthood</p>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {mode === 'hours' ? <Clock className="text-blue-600" /> : <Calendar className="text-emerald-600" />}
              Apply for {mode === 'hours' ? 'Hours' : 'Days'}
            </h3>
            <p className="text-sm text-slate-500">Fill in the details for your leave request</p>
          </div>
          <button onClick={() => setMode(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-emerald-600 text-sm">
              <Check size={18} />
              Leave request submitted successfully! Redirecting...
            </div>
          )}

          {mode === 'hours' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value, end_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Time</label>
                <input 
                  type="time" 
                  required
                  value={formData.from_time}
                  onChange={(e) => setFormData({ ...formData, from_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Time</label>
                <input 
                  type="time" 
                  required
                  value={formData.to_time}
                  onChange={(e) => setFormData({ ...formData, to_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Calculated Hours</label>
                <input 
                  type="text" 
                  readOnly
                  value={`${formData.hours.toFixed(2)} Hours`}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 font-bold"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                <input 
                  type="date" 
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Calculated Days (Excl. Weekends)</label>
                <input 
                  type="text" 
                  readOnly
                  value={`${formData.days} Days`}
                  className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-500 font-bold"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason Type</label>
            <select 
              value={formData.reason_type}
              onChange={(e) => setFormData({ ...formData, reason_type: e.target.value as any })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Medical">Medical</option>
              <option value="Parenthood">Parenthood</option>
              <option value="Others">Others</option>
            </select>
          </div>

          {formData.reason_type === 'Others' && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Please specify reason</label>
              <textarea 
                required
                rows={3}
                value={formData.other_reason}
                onChange={(e) => setFormData({ ...formData, other_reason: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter details..."
              ></textarea>
            </motion.div>
          )}

          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={formData.sick_hours_requested}
                  onChange={(e) => setFormData({ ...formData, sick_hours_requested: e.target.checked })}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 checked:bg-blue-600 checked:border-blue-600 transition-all"
                />
                <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" />
              </div>
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">Request to add Sick Hours if available</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  checked={formData.vacation_hours_requested}
                  onChange={(e) => setFormData({ ...formData, vacation_hours_requested: e.target.checked })}
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-slate-300 checked:bg-emerald-600 checked:border-emerald-600 transition-all"
                />
                <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 pointer-events-none" />
              </div>
              <span className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">Request to add Vacation Hours if Available</span>
            </label>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={cn(
              "w-full text-white font-bold py-4 rounded-xl shadow-lg transition-all disabled:opacity-50",
              mode === 'hours' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-100" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
            )}
          >
            {loading ? 'Submitting...' : 'Submit Leave Request'}
          </button>
        </form>
      </div>
    </div>
  );
}

function LeaveHistory({ user }: { user: User }) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [approverComment, setApproverComment] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    const res = await fetch(`/api/leaves?userId=${user.id}&role=${user.role}&t=${Date.now()}`);
    const data = await res.json();
    setLeaves(data);
    setLoading(false);
  };

  const handleStatusUpdate = async (leaveId: number, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !approverComment) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      const res = await fetch('/api/leaves/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leaveId, 
          status, 
          rejection_reason: approverComment,
          approverId: user.id 
        }),
      });
      if (res.ok) {
        setSelectedLeave(null);
        setApproverComment('');
        fetchLeaves();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading history...</div>;

  return (
    <div className="space-y-4">
      {leaves.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {leaves.map((leave) => (
            <div 
              key={leave.id} 
              className={cn(
                "p-5 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
                leave.status === 'pending' ? "bg-amber-50 border-amber-100" :
                leave.status === 'approved' ? "bg-emerald-50 border-emerald-100" :
                "bg-white border-slate-100"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  leave.status === 'approved' ? "bg-emerald-50 text-emerald-600" :
                  leave.status === 'rejected' ? "bg-rose-50 text-rose-600" :
                  "bg-amber-50 text-amber-600"
                )}>
                  {leave.status === 'approved' ? <Check size={24} /> :
                   leave.status === 'rejected' ? <X size={24} /> :
                   <Clock size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800">
                      {leave.sender_id !== user.id ? leave.sender_name : `${leave.type.charAt(0).toUpperCase() + leave.type.slice(1)} Leave`}
                    </h4>
                    {leave.sender_id !== user.id && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                          Peer
                        </span>
                        {leave.department_name && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                            {leave.department_name}
                          </span>
                        )}
                      </div>
                    )}
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium capitalize">
                      {leave.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                    <p className="flex items-center gap-1">
                      <Calendar size={12} />
                      {leave.start_date === leave.end_date 
                        ? format(new Date(leave.start_date), 'MMM d, yyyy')
                        : `${format(new Date(leave.start_date), 'MMM d')} - ${format(new Date(leave.end_date), 'MMM d, yyyy')}`}
                    </p>
                    {leave.type === 'hours' && (
                      <p className="flex items-center gap-1">
                        <Clock size={12} />
                        {leave.from_time} - {leave.to_time} ({leave.hours} hrs)
                      </p>
                    )}
                    {leave.type === 'days' && (
                      <p className="flex items-center gap-1">
                        <Clock size={12} />
                        {leave.days} Days
                      </p>
                    )}
                    {(leave.sick_hours_requested || leave.vacation_hours_requested) && (
                      <div className="flex gap-2 mt-1">
                        {leave.sick_hours_requested && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">Sick Hours</span>}
                        {leave.vacation_hours_requested && <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">Vacation Hours</span>}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-1 italic">"{leave.reason}"</p>
                  {leave.rejection_reason && (
                    <p className={cn(
                      "text-xs mt-1 font-medium",
                      leave.status === 'rejected' ? "text-rose-500" : "text-emerald-600"
                    )}>
                      {leave.status === 'rejected' ? 'Rejection Reason: ' : 'Approver Comment: '} 
                      {leave.rejection_reason}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StatusBadge status={leave.status} />
                {user.role === 'approver' && leave.status === 'pending' && (
                  <button 
                    onClick={() => setSelectedLeave(leave)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all"
                  >
                    Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <FileText size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium">No leave records found</p>
        </div>
      )}

      {/* Review Modal */}
      <AnimatePresence>
        {selectedLeave && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setSelectedLeave(null)}
            ></motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">Review Leave Request</h3>
                <button onClick={() => setSelectedLeave(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Employee</span>
                  <span className="font-bold text-slate-800">{selectedLeave.sender_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Dates</span>
                  <span className="font-bold text-slate-800">
                    {selectedLeave.start_date === selectedLeave.end_date 
                      ? selectedLeave.start_date 
                      : `${selectedLeave.start_date} to ${selectedLeave.end_date}`}
                  </span>
                </div>
                {selectedLeave.type === 'hours' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Time</span>
                      <span className="font-bold text-slate-800">{selectedLeave.from_time} - {selectedLeave.to_time}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total Hours</span>
                      <span className="font-bold text-slate-800">{selectedLeave.hours} Hours</span>
                    </div>
                  </>
                )}
                {selectedLeave.type === 'days' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Total Days</span>
                    <span className="font-bold text-slate-800">{selectedLeave.days} Days</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Type</span>
                  <span className="font-bold text-slate-800 capitalize">{selectedLeave.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Reason Type</span>
                  <span className="font-bold text-slate-800">{selectedLeave.reason_type}</span>
                </div>
                {(selectedLeave.sick_hours_requested || selectedLeave.vacation_hours_requested) && (
                  <div className="pt-2 flex gap-2">
                    {selectedLeave.sick_hours_requested && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-lg font-bold">Sick Hours Requested</span>
                    )}
                    {selectedLeave.vacation_hours_requested && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg font-bold">Vacation Hours Requested</span>
                    )}
                  </div>
                )}
                <div className="pt-4 border-t border-slate-50">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Reason Details</label>
                  <p className="text-slate-700 bg-slate-50 p-3 rounded-xl text-sm italic">"{selectedLeave.reason}"</p>
                </div>

                <div className="pt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Approver Comment / Reason</label>
                  <textarea 
                    value={approverComment}
                    onChange={(e) => setApproverComment(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Add a comment or reason for your decision..."
                  ></textarea>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => handleStatusUpdate(selectedLeave.id, 'rejected')}
                  className="flex-1 bg-white border border-rose-200 text-rose-600 font-bold py-3 rounded-xl hover:bg-rose-50 transition-all"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleStatusUpdate(selectedLeave.id, 'approved')}
                  className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
                >
                  Approve
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CalendarView({ user }: { user: User }) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setLoading(true);
    const res = await fetch(`/api/leaves?role=${user.role}&userId=${user.id}&t=${Date.now()}`);
    const data = await res.json();
    setLeaves(data);
    setLoading(false);
  };

  const getMonths = () => {
    const months = [];
    for (let i = 0; i < 3; i++) {
      months.push(addMonths(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1), i));
    }
    return months;
  };

  const nextMonths = () => setCurrentDate(addMonths(currentDate, 3));
  const prevMonths = () => setCurrentDate(addMonths(currentDate, -3));

  if (loading) return <div className="text-center py-12">Loading calendar...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={prevMonths} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200"><ChevronLeft size={20} /></button>
          <button onClick={nextMonths} className="p-2 hover:bg-slate-50 rounded-lg border border-slate-200"><ChevronRight size={20} /></button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {getMonths().map((monthDate, mIdx) => {
          const year = monthDate.getFullYear();
          const month = monthDate.getMonth();
          const totalDays = getDaysInMonth(monthDate);
          const startDay = getDay(monthDate);

          const calendarDays = [];
          for (let i = 0; i < startDay; i++) calendarDays.push(null);
          for (let i = 1; i <= totalDays; i++) calendarDays.push(i);

          return (
            <div key={mIdx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">{format(monthDate, 'MMMM yyyy')}</h3>
              <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-slate-400 uppercase mb-2">{d}</div>
                ))}
                {calendarDays.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="aspect-square"></div>;
                  
                  const dateStr = format(new Date(year, month, day), 'yyyy-MM-dd');
                  const dayLeaves = leaves.filter(l => dateStr >= l.start_date && dateStr <= l.end_date);
                  const hasPending = dayLeaves.some(l => l.status === 'pending');
                  const hasApproved = dayLeaves.some(l => l.status === 'approved');
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all border text-xs",
                        isSelected ? "border-blue-500 ring-2 ring-blue-100" : "border-transparent hover:bg-slate-50",
                        hasPending ? "bg-amber-50" : hasApproved ? "bg-emerald-50" : "bg-white"
                      )}
                    >
                      <span className={cn("font-bold", isSelected ? "text-blue-600" : "text-slate-700")}>{day}</span>
                      <div className="flex gap-0.5 mt-0.5">
                        {hasPending && <div className="w-1 h-1 rounded-full bg-amber-400"></div>}
                        {hasApproved && <div className="w-1 h-1 rounded-full bg-emerald-400"></div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h4 className="text-lg font-bold text-slate-800 mb-6">
            Leaves on {format(new Date(selectedDate), 'MMM d, yyyy')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {leaves.filter(l => selectedDate >= l.start_date && selectedDate <= l.end_date).length > 0 ? (
              leaves.filter(l => selectedDate >= l.start_date && selectedDate <= l.end_date).map(l => (
                <div key={l.id} className={cn(
                  "p-4 rounded-2xl border",
                  l.status === 'pending' ? "bg-amber-50 border-amber-100" : "bg-emerald-50 border-emerald-100"
                )}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-800">{l.sender_name}</span>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{l.type} Leave</p>
                  {l.type === 'hours' && <p className="text-[10px] text-blue-600 font-bold mb-1">{l.from_time} - {l.to_time} ({l.hours} hrs)</p>}
                  <p className="text-xs text-slate-600 italic line-clamp-2">"{l.reason}"</p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-slate-400">
                <Calendar size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No leave requests for this date</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentManagement() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', supervisor_id: undefined as number | undefined, location: '' });
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const t = Date.now();
    const [deptRes, userRes] = await Promise.all([
      fetch(`/api/departments?t=${t}`),
      fetch(`/api/users?t=${t}`)
    ]);
    const depts = await deptRes.json();
    const usrs = await userRes.json();
    setDepartments(depts);
    setUsers(usrs);
    setLoading(false);
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDept),
      });
      if (res.ok) {
        setNewDept({ name: '', supervisor_id: undefined, location: '' });
        setSuccess('Department added successfully!');
        setTimeout(() => {
          setShowAddForm(false);
          setSuccess('');
        }, 2000);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add department');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/departments/${editingDept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDept),
      });
      if (res.ok) {
        setSuccess('Department updated successfully!');
        setTimeout(() => {
          setEditingDept(null);
          setSuccess('');
        }, 1500);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update department');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDept = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    await fetch(`/api/departments/${id}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading departments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Departments</h3>
          <p className="text-sm text-slate-500">Manage company departments and locations</p>
        </div>
        <button 
          onClick={() => { setShowAddForm(!showAddForm); setEditingDept(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={18} />
          Add Department
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddDept} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="col-span-full mb-2">
                <h4 className="text-sm font-bold text-blue-600">Add New Department</h4>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Department Name</label>
                <input 
                  type="text" 
                  required
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Engineering"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location</label>
                <input 
                  type="text" 
                  value={newDept.location}
                  onChange={(e) => setNewDept({ ...newDept, location: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Supervisor (Optional)</label>
                <select 
                  value={newDept.supervisor_id || ''}
                  onChange={(e) => setNewDept({ ...newDept, supervisor_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">None</option>
                  {users.filter(u => u.role === 'supervisor' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Adding...' : 'Add'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="col-span-full text-xs text-rose-500 mt-1">{error}</p>}
              {success && <p className="col-span-full text-xs text-emerald-500 mt-1">{success}</p>}
            </form>
          </motion.div>
        )}

        {editingDept && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <form onSubmit={handleUpdateDept} className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="col-span-full mb-2">
                <h4 className="text-sm font-bold text-amber-600">Edit Department: {editingDept.name}</h4>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Department Name</label>
                <input 
                  type="text" 
                  required
                  value={editingDept.name}
                  onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location</label>
                <input 
                  type="text" 
                  value={editingDept.location || ''}
                  onChange={(e) => setEditingDept({ ...editingDept, location: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Supervisor (Optional)</label>
                <select 
                  value={editingDept.supervisor_id || ''}
                  onChange={(e) => setEditingDept({ ...editingDept, supervisor_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="">None</option>
                  {users.filter(u => u.role === 'supervisor' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-600 text-white font-bold py-2 rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingDept(null)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="col-span-full text-xs text-rose-500 mt-1">{error}</p>}
              {success && <p className="col-span-full text-xs text-emerald-500 mt-1">{success}</p>}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Supervisor</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{d.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{d.location || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {users.find(u => u.id === d.supervisor_id)?.name || 'None'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setEditingDept(d); setShowAddForm(false); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteDept(d.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SubDepartmentManagement() {
  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSubDept, setNewSubDept] = useState({ name: '', department_id: undefined as number | undefined });
  const [editingSubDept, setEditingSubDept] = useState<SubDepartment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const t = Date.now();
    const [subDeptRes, deptRes] = await Promise.all([
      fetch(`/api/sub-departments?t=${t}`),
      fetch(`/api/departments?t=${t}`)
    ]);
    const subDepts = await subDeptRes.json();
    const depts = await deptRes.json();
    setSubDepartments(subDepts);
    setDepartments(depts);
    setLoading(false);
  };

  const handleAddSubDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubDept.department_id) {
      setError('Please select a department');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/sub-departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSubDept),
      });
      if (res.ok) {
        setNewSubDept({ name: '', department_id: undefined });
        setSuccess('Sub-Department added successfully!');
        setTimeout(() => {
          setShowAddForm(false);
          setSuccess('');
        }, 2000);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add sub-department');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubDept || !editingSubDept.department_id) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/sub-departments/${editingSubDept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingSubDept),
      });
      if (res.ok) {
        setSuccess('Sub-Department updated successfully!');
        setTimeout(() => {
          setEditingSubDept(null);
          setSuccess('');
        }, 1500);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update sub-department');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSubDept = async (id: number) => {
    if (!confirm('Are you sure you want to delete this sub-department?')) return;
    await fetch(`/api/sub-departments/${id}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Loading sub-departments...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Sub-Departments</h3>
          <p className="text-sm text-slate-500">Manage sub-divisions within departments</p>
        </div>
        <button 
          onClick={() => { setShowAddForm(!showAddForm); setEditingSubDept(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={18} />
          Add Sub-Department
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddSubDept} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="col-span-full mb-2">
                <h4 className="text-sm font-bold text-blue-600">Add New Sub-Department</h4>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sub-Department Name</label>
                <input 
                  type="text" 
                  required
                  value={newSubDept.name}
                  onChange={(e) => setNewSubDept({ ...newSubDept, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="UI Design"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Parent Department</label>
                <select 
                  required
                  value={newSubDept.department_id || ''}
                  onChange={(e) => setNewSubDept({ ...newSubDept, department_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Adding...' : 'Add'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="col-span-full text-xs text-rose-500 mt-1">{error}</p>}
              {success && <p className="col-span-full text-xs text-emerald-500 mt-1">{success}</p>}
            </form>
          </motion.div>
        )}

        {editingSubDept && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <form onSubmit={handleUpdateSubDept} className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div className="col-span-full mb-2">
                <h4 className="text-sm font-bold text-amber-600">Edit Sub-Department: {editingSubDept.name}</h4>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sub-Department Name</label>
                <input 
                  type="text" 
                  required
                  value={editingSubDept.name}
                  onChange={(e) => setEditingSubDept({ ...editingSubDept, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Parent Department</label>
                <select 
                  required
                  value={editingSubDept.department_id || ''}
                  onChange={(e) => setEditingSubDept({ ...editingSubDept, department_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-600 text-white font-bold py-2 rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingSubDept(null)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="col-span-full text-xs text-rose-500 mt-1">{error}</p>}
              {success && <p className="col-span-full text-xs text-emerald-500 mt-1">{success}</p>}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Sub-Department</th>
                <th className="px-6 py-4">Parent Department</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {subDepartments.map((sd) => (
                <tr key={sd.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{sd.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {departments.find(d => d.id === sd.department_id)?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setEditingSubDept(sd); setShowAddForm(false); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => deleteSubDept(sd.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ 
    email: '', 
    name: '', 
    role: 'sender' as const, 
    supervisor_ids: [] as number[], 
    department_id: undefined as number | undefined, 
    sub_department_id: undefined as number | undefined,
    birth_date: '',
    manager_id: undefined as number | undefined,
    planner_id: undefined as number | undefined,
    quality_id: undefined as number | undefined,
    password: '' 
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const [subDepartments, setSubDepartments] = useState<SubDepartment[]>([]);

  const fetchData = async () => {
    const t = Date.now();
    const [userRes, deptRes, subDeptRes] = await Promise.all([
      fetch(`/api/users?t=${t}`),
      fetch(`/api/departments?t=${t}`),
      fetch(`/api/sub-departments?t=${t}`)
    ]);
    const userData = await userRes.json();
    const deptData = await deptRes.json();
    const subDeptData = await subDeptRes.json();
    setUsers(userData);
    setDepartments(deptData);
    setSubDepartments(subDeptData);
    setLoading(false);
  };

  const fetchUsers = fetchData; // Alias for compatibility with existing code if any

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, email: newUser.email.trim() }),
      });
      if (res.ok) {
        setNewUser({ email: '', name: '', role: 'sender', supervisor_ids: [], department_id: undefined, password: '' });
        setSuccess('User added successfully!');
        setTimeout(() => {
          setShowAddForm(false);
          setSuccess('');
        }, 2000);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to add user');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editingUser, email: editingUser.email.trim() }),
      });
      if (res.ok) {
        setSuccess('User updated successfully!');
        setTimeout(() => {
          setEditingUser(null);
          setSuccess('');
        }, 1500);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update user');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateRole = async (userId: number, role: string) => {
    await fetch('/api/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
    });
    fetchData();
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    fetchData();
  };

  if (loading) return <div className="text-center py-12">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-800">User Access Control</h3>
          <p className="text-sm text-slate-500">Assign roles and manage permissions</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus size={18} />
          Add New User
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddUser} className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="col-span-full mb-2">
                <h4 className="text-sm font-bold text-blue-600">Add New User</h4>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="john@pnc.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="123"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Role</label>
                <select 
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="sender">Employee (Sender)</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                  <option value="planner">Planner</option>
                  <option value="quality">Quality</option>
                  <option value="approver">Approver</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Birth Date</label>
                <input 
                  type="date" 
                  required
                  value={newUser.birth_date}
                  onChange={(e) => setNewUser({ ...newUser, birth_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Department</label>
                <select 
                  value={newUser.department_id || ''}
                  onChange={(e) => setNewUser({ ...newUser, department_id: e.target.value ? parseInt(e.target.value) : undefined, sub_department_id: undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">None</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sub Department</label>
                <select 
                  value={newUser.sub_department_id || ''}
                  onChange={(e) => setNewUser({ ...newUser, sub_department_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  disabled={!newUser.department_id}
                >
                  <option value="">None</option>
                  {subDepartments.filter(sd => sd.department_id === newUser.department_id).map(sd => (
                    <option key={sd.id} value={sd.id}>{sd.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Manager</label>
                <select 
                  value={newUser.manager_id || ''}
                  onChange={(e) => setNewUser({ ...newUser, manager_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">None</option>
                  {users.filter(u => u.role === 'manager' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Planner</label>
                <select 
                  value={newUser.planner_id || ''}
                  onChange={(e) => setNewUser({ ...newUser, planner_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">None</option>
                  {users.filter(u => u.role === 'planner' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Quality</label>
                <select 
                  value={newUser.quality_id || ''}
                  onChange={(e) => setNewUser({ ...newUser, quality_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">None</option>
                  {users.filter(u => u.role === 'quality' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Supervisors (Select Multiple)</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                  {users.filter(u => u.role === 'supervisor' || u.role === 'admin').map(u => (
                    <label key={u.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-white p-2 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                      <input 
                        type="checkbox"
                        checked={newUser.supervisor_ids.includes(u.id)}
                        onChange={(e) => {
                          const ids = e.target.checked 
                            ? [...newUser.supervisor_ids, u.id]
                            : newUser.supervisor_ids.filter(id => id !== u.id);
                          setNewUser({ ...newUser, supervisor_ids: ids });
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{u.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{u.role}</span>
                      </div>
                    </label>
                  ))}
                  {users.filter(u => u.role === 'supervisor' || u.role === 'admin').length === 0 && (
                    <div className="py-4 text-center">
                      <p className="text-xs text-slate-400 italic">No supervisors or admins available to assign</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Adding...' : 'Add User'}
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="col-span-full text-xs text-rose-500 mt-1">{error}</p>}
              {success && <p className="col-span-full text-xs text-emerald-500 mt-1">{success}</p>}
            </form>
          </motion.div>
        )}

        {editingUser && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <form onSubmit={handleUpdateUser} className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="col-span-full mb-2">
                <h4 className="text-sm font-bold text-amber-600">Edit User: {editingUser.name}</h4>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">New Password (Optional)</label>
                <input 
                  type="password" 
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  placeholder="Leave blank to keep current"
                />
              </div>
               <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Role</label>
                <select 
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="sender">Employee (Sender)</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                  <option value="planner">Planner</option>
                  <option value="quality">Quality</option>
                  <option value="approver">Approver</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Birth Date</label>
                <input 
                  type="date" 
                  value={editingUser.birth_date || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, birth_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Department</label>
                <select 
                  value={editingUser.department_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, department_id: e.target.value ? parseInt(e.target.value) : undefined, sub_department_id: undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="">None</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Sub Department</label>
                <select 
                  value={editingUser.sub_department_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, sub_department_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  disabled={!editingUser.department_id}
                >
                  <option value="">None</option>
                  {subDepartments.filter(sd => sd.department_id === editingUser.department_id).map(sd => (
                    <option key={sd.id} value={sd.id}>{sd.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Manager</label>
                <select 
                  value={editingUser.manager_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, manager_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="">None</option>
                  {users.filter(u => u.role === 'manager' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Planner</label>
                <select 
                  value={editingUser.planner_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, planner_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="">None</option>
                  {users.filter(u => u.role === 'planner' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Quality</label>
                <select 
                  value={editingUser.quality_id || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, quality_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                >
                  <option value="">None</option>
                  {users.filter(u => u.role === 'quality' || u.role === 'admin').map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Supervisors (Select Multiple)</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 bg-white focus-within:ring-2 focus-within:ring-amber-500 transition-all">
                  {users.filter(u => (u.role === 'supervisor' || u.role === 'admin') && u.id !== editingUser.id).map(u => (
                    <label key={u.id} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                      <input 
                        type="checkbox"
                        checked={editingUser.supervisor_ids?.includes(u.id)}
                        onChange={(e) => {
                          const currentIds = editingUser.supervisor_ids || [];
                          const ids = e.target.checked 
                            ? [...currentIds, u.id]
                            : currentIds.filter(id => id !== u.id);
                          setEditingUser({ ...editingUser, supervisor_ids: ids });
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{u.name}</span>
                        <span className="text-[10px] text-slate-400 uppercase">{u.role}</span>
                      </div>
                    </label>
                  ))}
                  {users.filter(u => (u.role === 'supervisor' || u.role === 'admin') && u.id !== editingUser.id).length === 0 && (
                    <div className="py-4 text-center">
                      <p className="text-xs text-slate-400 italic">No other supervisors available</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 md:col-span-1">
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-amber-600 text-white font-bold py-2 rounded-lg hover:bg-amber-700 transition-all disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
              {error && <p className="col-span-full text-xs text-rose-500 mt-1">{error}</p>}
              {success && <p className="col-span-full text-xs text-emerald-500 mt-1">{success}</p>}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
            <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Dept / Sub-Dept</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Birth Date</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Management</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800">{u.name}</span>
                    <span className="text-xs text-slate-500">{u.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                    u.role === 'admin' ? "bg-purple-50 text-purple-600" :
                    u.role === 'supervisor' ? "bg-blue-50 text-blue-600" :
                    u.role === 'manager' ? "bg-emerald-50 text-emerald-600" :
                    u.role === 'planner' ? "bg-amber-50 text-amber-600" :
                    u.role === 'quality' ? "bg-rose-50 text-rose-600" :
                    "bg-slate-50 text-slate-600"
                  )}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-700">{departments.find(d => d.id === u.department_id)?.name || '-'}</span>
                    <span className="text-xs text-slate-400">{subDepartments.find(sd => sd.id === u.sub_department_id)?.name || '-'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-slate-600">{u.birth_date || '-'}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    {u.manager_id && <span className="text-[10px] text-slate-500">M: {users.find(usr => usr.id === u.manager_id)?.name}</span>}
                    {u.planner_id && <span className="text-[10px] text-slate-500">P: {users.find(usr => usr.id === u.planner_id)?.name}</span>}
                    {u.quality_id && <span className="text-[10px] text-slate-500">Q: {users.find(usr => usr.id === u.quality_id)?.name}</span>}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <select 
                      value={u.role}
                      onChange={(e) => updateRole(u.id, e.target.value)}
                      className="text-sm border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                  <option value="sender">Sender</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="manager">Manager</option>
                  <option value="planner">Planner</option>
                  <option value="quality">Quality</option>
                  <option value="approver">Approver</option>
                  <option value="admin">Admin</option>
                    </select>
                    <button 
                      onClick={() => {
                        setEditingUser(u);
                        setShowAddForm(false);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Edit User"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => deleteUser(u.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                      title="Delete User"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
}
