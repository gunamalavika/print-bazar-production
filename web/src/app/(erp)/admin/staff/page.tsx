'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  Clock,
  CheckCircle,
  Plus,
  KeyRound,
  ShieldAlert,
  ArrowRight,
  Trash2,
  Edit3,
  Search,
  X,
  AlertTriangle,
  Check,
  Layers,
  Building2,
  Briefcase,
  UserCheck,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Mail,
  Smartphone,
  User,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';

export interface StaffMember {
  id: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  phone?: string;
  roles: string[];
  role?: string; // backwards compatibility
  department: string;
  shift: string;
  station: string;
  status: 'ACTIVE_ON_FLOOR' | 'OFF_SHIFT';
  loginEnabled?: boolean;
}

const AVAILABLE_ROLES = [
  { id: 'PRODUCTION_OPERATOR', label: 'Production Operator', dept: 'PRESS_OPERATIONS', destination: '/production/queue' },
  { id: 'FINAL_QC_INSPECTOR', label: 'Final QC Inspector', dept: 'QUALITY_ASSURANCE', destination: '/qc/inspection' },
  { id: 'DESIGNER_PREPRESS', label: 'Pre-Press Designer', dept: 'PREPRESS', destination: '/prepress/artwork' },
  { id: 'PACKING_OPERATOR', label: 'Packing Operator', dept: 'PACKAGING', destination: '/packing/station' },
  { id: 'DISPATCH_LOGISTICS', label: 'Dispatch Logistics', dept: 'LOGISTICS', destination: '/dispatch/manifest' },
  { id: 'OPERATIONAL_MANAGER', label: 'Operations Manager', dept: 'OPERATIONS', destination: '/operations' },
  { id: 'ADMIN_MANAGER', label: 'Admin Manager', dept: 'MANAGEMENT', destination: '/admin/dashboard' },
  { id: 'SALES_OFFICE', label: 'Sales & Front Office', dept: 'SALES', destination: '/sales/orders' },
  { id: 'ACCOUNTS', label: 'Accounts & Billing', dept: 'FINANCE', destination: '/finance/payments' },
];

const AVAILABLE_DEPARTMENTS = [
  'PRESS_OPERATIONS',
  'PREPRESS',
  'QUALITY_ASSURANCE',
  'PACKAGING',
  'LOGISTICS',
  'OPERATIONS',
  'MANAGEMENT',
  'SALES',
  'FINANCE',
];

const AVAILABLE_SHIFTS = [
  'Shift A (06:00 - 14:00)',
  'Shift B (14:00 - 22:00)',
  'Shift C (22:00 - 06:00)',
  'General (09:00 - 18:00)',
];

const COMMON_STATIONS = [
  'HP Indigo 12000 Station',
  'Heidelberg Speedmaster XL 75',
  'Esko & PitStop Workstation 01',
  'Polar High-Speed Cutter 115',
  'Physical Inspection Lightbox D50',
  'Digital Scale Weigh Station 02',
  'Thermal Laminator Station 01',
  'Courier Bay & Store Counter',
  'Operations Command Center',
  'Central Production Office',
];

const INITIAL_STAFF_ROSTER: StaffMember[] = [
  {
    id: 'EMP-01',
    name: 'Vikramaditya Rao',
    username: 'vikramaditya.rao',
    email: 'operations@printbazzar.com',
    password: 'Admin@12345',
    phone: '+919811223344',
    roles: ['ADMIN_MANAGER', 'OPERATIONAL_MANAGER'],
    department: 'OPERATIONS',
    shift: 'General (09:00 - 18:00)',
    station: 'Central Production Office',
    status: 'ACTIVE_ON_FLOOR',
    loginEnabled: true,
  },
  {
    id: 'EMP-02',
    name: 'Rajesh Kumar',
    username: 'rajesh.kumar',
    email: 'operator@printbazzar.com',
    password: 'Admin@12345',
    phone: '+919822334455',
    roles: ['PRODUCTION_OPERATOR', 'FINAL_QC_INSPECTOR'],
    department: 'PRESS_OPERATIONS',
    shift: 'Shift A (06:00 - 14:00)',
    station: 'HP Indigo 12000 Station',
    status: 'ACTIVE_ON_FLOOR',
    loginEnabled: true,
  },
  {
    id: 'EMP-03',
    name: 'Sneha Patil',
    username: 'sneha.patil',
    email: 'prepress@printbazzar.com',
    password: 'Admin@12345',
    phone: '+919833445566',
    roles: ['DESIGNER_PREPRESS'],
    department: 'PREPRESS',
    shift: 'General (09:00 - 18:00)',
    station: 'Esko & PitStop Workstation 01',
    status: 'ACTIVE_ON_FLOOR',
    loginEnabled: true,
  },
  {
    id: 'EMP-04',
    name: 'Mahesh Shinde',
    username: 'mahesh.shinde',
    email: 'admin@printbazzar.com',
    password: 'Admin@12345',
    phone: '+919844556677',
    roles: ['ADMIN_MANAGER'],
    department: 'MANAGEMENT',
    shift: 'General (09:00 - 18:00)',
    station: 'Operations Command Center',
    status: 'ACTIVE_ON_FLOOR',
    loginEnabled: true,
  },
  {
    id: 'EMP-05',
    name: 'Anita Desai',
    username: 'anita.desai',
    email: 'finalqc@printbazzar.com',
    password: 'Admin@12345',
    phone: '+919855667788',
    roles: ['FINAL_QC_INSPECTOR'],
    department: 'QUALITY_ASSURANCE',
    shift: 'Shift A (06:00 - 14:00)',
    station: 'Physical Inspection Lightbox D50',
    status: 'ACTIVE_ON_FLOOR',
    loginEnabled: true,
  },
  {
    id: 'EMP-06',
    name: 'Sunil Varma',
    username: 'sunil.varma',
    email: 'packing@printbazzar.com',
    password: 'Admin@12345',
    phone: '+919866778899',
    roles: ['PACKING_OPERATOR', 'DISPATCH_LOGISTICS'],
    department: 'PACKAGING',
    shift: 'Shift A (06:00 - 14:00)',
    station: 'Digital Scale Weigh Station 02',
    status: 'ACTIVE_ON_FLOOR',
    loginEnabled: true,
  },
  {
    id: 'EMP-07',
    name: 'Karan Mehra',
    username: 'karan.mehra',
    email: 'dispatch@printbazzar.com',
    password: 'Admin@12345',
    phone: '+919877889900',
    roles: ['DISPATCH_LOGISTICS'],
    department: 'LOGISTICS',
    shift: 'Shift A (06:00 - 14:00)',
    station: 'Courier Bay & Store Counter',
    status: 'ACTIVE_ON_FLOOR',
    loginEnabled: true,
  },
];

const STORAGE_KEY = 'printbazzar_staff_roster_v3';

export default function StaffAdminPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>(INITIAL_STAFF_ROSTER);
  const [isLoaded, setIsLoaded] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Password visibility & generator
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Delete modal state
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);

  // Credentials viewer modal state
  const [credentialsStaff, setCredentialsStaff] = useState<StaffMember | null>(null);
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    username: string;
    email: string;
    password: string;
    phone: string;
    roles: string[];
    department: string;
    shift: string;
    station: string;
    status: 'ACTIVE_ON_FLOOR' | 'OFF_SHIFT';
    loginEnabled: boolean;
  }>({
    id: '',
    name: '',
    username: '',
    email: '',
    password: 'Admin@12345',
    phone: '',
    roles: ['PRODUCTION_OPERATOR'],
    department: 'PRESS_OPERATIONS',
    shift: 'Shift A (06:00 - 14:00)',
    station: 'HP Indigo 12000 Station',
    status: 'ACTIVE_ON_FLOOR',
    loginEnabled: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((item: any) => {
            const cleanName = item.name || 'Staff Member';
            const defaultUser = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.');
            return {
              ...item,
              username: item.username || defaultUser,
              email: item.email || `${defaultUser}@printbazzar.com`,
              password: item.password || 'Admin@12345',
              phone: item.phone || '',
              loginEnabled: item.loginEnabled !== false,
              roles: Array.isArray(item.roles) && item.roles.length > 0
                ? item.roles
                : item.role ? [item.role] : ['PRODUCTION_OPERATOR'],
            };
          });
          setStaffList(normalized);
        }
      }
    } catch {
      // Fallback to initial
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save changes to local storage
  const saveRoster = (newList: StaffMember[]) => {
    setStaffList(newList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newList));
    } catch {
      // Ignore write errors
    }
  };

  // Generate next ID
  const generateNextId = () => {
    const existingNums = staffList
      .map((s) => {
        const match = s.id.match(/EMP-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((n) => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 7;
    const nextNum = maxNum + 1;
    return `EMP-${nextNum.toString().padStart(2, '0')}`;
  };

  // Generate random secure password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$';
    let res = 'Pb@';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    const nextId = generateNextId();
    setEditingStaffId(null);
    setShowFormPassword(false);
    setFormData({
      id: nextId,
      name: '',
      username: '',
      email: '',
      password: 'Admin@12345',
      phone: '',
      roles: ['PRODUCTION_OPERATOR'],
      department: 'PRESS_OPERATIONS',
      shift: 'Shift A (06:00 - 14:00)',
      station: 'HP Indigo 12000 Station',
      status: 'ACTIVE_ON_FLOOR',
      loginEnabled: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Auto-generate username and email as user types full name if not manually modified
  const handleNameChange = (nameVal: string) => {
    const clean = nameVal.trim().toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
    setFormData((prev) => {
      const isUsernameAuto = !prev.username || prev.username === prev.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.');
      const isEmailAuto = !prev.email || prev.email.endsWith('@printbazzar.com');
      return {
        ...prev,
        name: nameVal,
        username: isUsernameAuto ? clean : prev.username,
        email: isEmailAuto && clean ? `${clean}@printbazzar.com` : prev.email,
      };
    });
  };

  // Open Edit Modal
  const handleOpenEditModal = (staff: StaffMember) => {
    setEditingStaffId(staff.id);
    setShowFormPassword(false);
    const memberRoles = staff.roles && staff.roles.length > 0
      ? staff.roles
      : staff.role ? [staff.role] : ['PRODUCTION_OPERATOR'];

    const cleanName = staff.name.toLowerCase().replace(/[^a-z0-9]/g, '.');

    setFormData({
      id: staff.id,
      name: staff.name,
      username: staff.username || cleanName,
      email: staff.email || `${cleanName}@printbazzar.com`,
      password: staff.password || 'Admin@12345',
      phone: staff.phone || '',
      roles: memberRoles,
      department: staff.department,
      shift: staff.shift,
      station: staff.station,
      status: staff.status,
      loginEnabled: staff.loginEnabled !== false,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  // Toggle role in form
  const handleToggleRole = (roleId: string) => {
    setFormData((prev) => {
      const exists = prev.roles.includes(roleId);
      if (exists) {
        if (prev.roles.length === 1) return prev;
        return { ...prev, roles: prev.roles.filter((r) => r !== roleId) };
      } else {
        return { ...prev, roles: [...prev.roles, roleId] };
      }
    });
  };

  // Handle Save Staff
  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Staff / Operator name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Work email is required for employee login.');
      return;
    }
    if (!formData.station.trim()) {
      setFormError('Assigned workstation is required.');
      return;
    }
    if (formData.roles.length === 0) {
      setFormError('Please assign at least one role.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    // Try registering in backend database if new and loginEnabled
    if (!editingStaffId && formData.loginEnabled) {
      try {
        await api.register({
          email: formData.email.trim().toLowerCase(),
          password: formData.password || 'Admin@12345',
          fullName: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
        });
      } catch (err: any) {
        // If already exists or error, log notice but still proceed with roster save
        console.info('Backend registration note:', err?.message || err);
      }
    }

    const cleanUsername = formData.username.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '.');

    if (editingStaffId) {
      // Update existing
      const updated = staffList.map((member) =>
        member.id === editingStaffId
          ? {
              ...member,
              name: formData.name.trim(),
              username: cleanUsername,
              email: formData.email.trim().toLowerCase(),
              password: formData.password,
              phone: formData.phone.trim(),
              roles: formData.roles,
              department: formData.department,
              shift: formData.shift,
              station: formData.station.trim(),
              status: formData.status,
              loginEnabled: formData.loginEnabled,
            }
          : member
      );
      saveRoster(updated);
    } else {
      // Add new
      const exists = staffList.some(
        (s) => s.id.toLowerCase() === formData.id.trim().toLowerCase()
      );
      const finalId = exists ? generateNextId() : formData.id.trim();

      const newMember: StaffMember = {
        id: finalId,
        name: formData.name.trim(),
        username: cleanUsername,
        email: formData.email.trim().toLowerCase(),
        password: formData.password || 'Admin@12345',
        phone: formData.phone.trim(),
        roles: formData.roles,
        department: formData.department,
        shift: formData.shift,
        station: formData.station.trim(),
        status: formData.status,
        loginEnabled: formData.loginEnabled,
      };
      saveRoster([newMember, ...staffList]);
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  // Handle Delete Confirmation
  const handleConfirmDelete = () => {
    if (!staffToDelete) return;
    const updated = staffList.filter((s) => s.id !== staffToDelete.id);
    saveRoster(updated);
    setStaffToDelete(null);
  };

  // Reset to initial roster
  const handleResetToDefault = () => {
    if (confirm('Reset shift roster back to default plant seed operators?')) {
      saveRoster(INITIAL_STAFF_ROSTER);
    }
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Filtered List
  const filteredStaff = useMemo(() => {
    return staffList.filter((member) => {
      // Shift filter
      if (selectedShiftFilter !== 'ALL' && !member.shift.startsWith(selectedShiftFilter)) {
        return false;
      }
      // Department filter
      if (selectedDeptFilter !== 'ALL' && member.department !== selectedDeptFilter) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const rolesList = (member.roles || [member.role || '']).join(' ').toLowerCase();
        const matchName = member.name.toLowerCase().includes(q);
        const matchId = member.id.toLowerCase().includes(q);
        const matchEmail = (member.email || '').toLowerCase().includes(q);
        const matchUsername = (member.username || '').toLowerCase().includes(q);
        const matchStation = member.station.toLowerCase().includes(q);
        const matchDept = member.department.toLowerCase().includes(q);
        const matchRole = rolesList.includes(q);
        if (!matchName && !matchId && !matchEmail && !matchUsername && !matchStation && !matchDept && !matchRole) {
          return false;
        }
      }
      return true;
    });
  }, [staffList, selectedShiftFilter, selectedDeptFilter, searchQuery]);

  // Statistics
  const totalStaffCount = staffList.length;
  const onDutyCount = staffList.filter((s) => s.status === 'ACTIVE_ON_FLOOR').length;
  const multiRoleCount = staffList.filter(
    (s) => (s.roles?.length || (s.role ? 1 : 0)) > 1
  ).length;
  const activeStationsCount = new Set(staffList.map((s) => s.station)).size;

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>FACTORY ROSTER & RBAC</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">SHOP-FLOOR OPERATORS</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Staff Roster & Employee Login Access
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Active plant shifts, station allocations, employee usernames & passwords for workstation login.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/login"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition"
            title="Open Employee Login Portal in a new tab"
          >
            <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
            <span>Employee Login Portal</span>
          </Link>
          <button
            onClick={handleResetToDefault}
            title="Reset to default seed roster"
            className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-lg transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] px-4 py-2.5 rounded-lg shadow-sm transition active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 text-amber-300" />
            <span>Assign Operator to Shift</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Staff</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalStaffCount}</span>
            <span className="text-[11px] font-mono text-slate-400">Personnel</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active On Floor</span>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{onDutyCount}</span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              ON DUTY
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Multi-Role Staff</span>
            <Layers className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{multiRoleCount}</span>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Cross-Trained
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Assigned Stations</span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{activeStationsCount}</span>
            <span className="text-[11px] font-mono text-slate-400">Lines Active</span>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, ID, email, username, role, or station..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Shift Filter Pills */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-medium">
            <button
              onClick={() => setSelectedShiftFilter('ALL')}
              className={`px-2.5 py-1 rounded-md transition ${
                selectedShiftFilter === 'ALL'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Shifts
            </button>
            <button
              onClick={() => setSelectedShiftFilter('Shift A')}
              className={`px-2.5 py-1 rounded-md transition ${
                selectedShiftFilter === 'Shift A'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shift A
            </button>
            <button
              onClick={() => setSelectedShiftFilter('Shift B')}
              className={`px-2.5 py-1 rounded-md transition ${
                selectedShiftFilter === 'Shift B'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shift B
            </button>
            <button
              onClick={() => setSelectedShiftFilter('General')}
              className={`px-2.5 py-1 rounded-md transition ${
                selectedShiftFilter === 'General'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              General
            </button>
          </div>

          {/* Department Dropdown Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 text-slate-700 font-medium py-1.5 px-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="ALL">All Departments</option>
            {AVAILABLE_DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Roster Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[12px] font-semibold text-slate-700 uppercase tracking-wider">
              Shift Operators Roster ({filteredStaff.length} Members)
            </h2>
            {onDutyCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                {onDutyCount} On-Duty
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400">
              {selectedShiftFilter === 'ALL' ? 'Plant-Wide Matrix' : selectedShiftFilter}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-mono text-[12px] font-semibold uppercase bg-slate-50">
                <th className="p-3.5">EMPLOYEE & LOGIN ID</th>
                <th className="p-3.5 min-w-[190px]">ROLES (RBAC)</th>
                <th className="p-3.5">DEPARTMENT</th>
                <th className="p-3.5">ASSIGNED STATION</th>
                <th className="p-3.5">SHIFT</th>
                <th className="p-3.5 text-center">DUTY</th>
                <th className="p-3.5 text-center">LOGIN ACCESS</th>
                <th className="p-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-slate-600">No staff members found matching criteria.</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or assign a new operator to the shift.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const roles = staff.roles && staff.roles.length > 0
                    ? staff.roles
                    : staff.role ? [staff.role] : ['PRODUCTION_OPERATOR'];

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Employee details & login */}
                      <td className="p-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-900 text-amber-300 font-semibold flex items-center justify-center text-[11px] shrink-0 shadow-2xs mt-0.5">
                            {staff.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong className="block text-slate-900 font-semibold text-[13px] leading-tight">
                              {staff.name}
                            </strong>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] font-mono text-slate-400">{staff.id}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-[11px] font-mono text-slate-600 truncate max-w-[150px]" title={staff.email}>
                                {staff.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Multi-role badges */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1.5 max-w-[240px]">
                          {roles.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center gap-1 bg-slate-900 text-amber-300 text-[10.5px] font-mono font-semibold px-2 py-0.5 rounded-md border border-slate-700 shadow-2xs"
                            >
                              <ShieldCheck className="h-2.5 w-2.5 text-amber-400" />
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="p-3.5 font-mono text-slate-600 text-[12px]">
                        {staff.department}
                      </td>

                      {/* Station */}
                      <td className="p-3.5 text-[13px] font-medium text-slate-900">
                        {staff.station}
                      </td>

                      {/* Shift */}
                      <td className="p-3.5 text-[12px] text-slate-500 font-mono">
                        {staff.shift}
                      </td>

                      {/* Floor Duty Status */}
                      <td className="p-3.5 text-center">
                        {staff.status === 'ACTIVE_ON_FLOOR' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            ON DUTY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-200">
                            OFF SHIFT
                          </span>
                        )}
                      </td>

                      {/* Login Access Badge & View */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            setCredentialsStaff(staff);
                            setShowCredPassword(false);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition"
                          title="View login username & password"
                        >
                          <KeyRound className="h-3 w-3 text-amber-600" />
                          <span>Login Info</span>
                        </button>
                      </td>

                      {/* Actions: Edit, Credentials & Delete */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setCredentialsStaff(staff);
                              setShowCredPassword(false);
                            }}
                            title="View / Copy Login Credentials"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition"
                          >
                            <Lock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(staff)}
                            title="Edit Operator Assignment"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setStaffToDelete(staff)}
                            title="Delete / Remove Operator"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Assign / Edit Operator Modal (With Username & Password) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStaffId ? 'Edit Operator Shift & Login' : 'Assign Operator to Shift & Create Login'}
        subtitle={
          editingStaffId
            ? 'Update active plant shift, workstation assignment, and login credentials.'
            : 'Register a factory operator with work credentials so they can log in and start working.'
        }
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveStaff} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT COLUMN: Operator Identity & Shift/Station Allocation */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-500" />
                  <span>1. Operator Details & Station Allocation</span>
                </h4>
              </div>

              {/* Name and ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full text-xs sm:text-[13px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="EMP-08"
                    className="w-full text-xs sm:text-[13px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Department and Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Department
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full text-xs sm:text-[13px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  >
                    {AVAILABLE_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Shift Allocation
                  </label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full text-xs sm:text-[13px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                  >
                    {AVAILABLE_SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned Workstation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Workstation / Equipment *
                </label>
                <input
                  type="text"
                  required
                  list="stations-datalist-modal"
                  value={formData.station}
                  onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                  placeholder="e.g. HP Indigo 12000 Station"
                  className="w-full text-xs sm:text-[13px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition"
                />
                <datalist id="stations-datalist-modal">
                  {COMMON_STATIONS.map((station) => (
                    <option key={station} value={station} />
                  ))}
                </datalist>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[11px] text-slate-400 mr-1 self-center">Quick pick:</span>
                  {['HP Indigo 12000', 'Polar Cutter', 'Lightbox D50', 'Weigh Station 02'].map((q) => (
                    <button
                      type="button"
                      key={q}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          station:
                            COMMON_STATIONS.find((s) => s.includes(q)) || `${q} Station`,
                        })
                      }
                      className="text-[10.5px] px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duty Status */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Floor Duty Status
                </label>
                <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'ACTIVE_ON_FLOOR'}
                      onChange={() => setFormData({ ...formData, status: 'ACTIVE_ON_FLOOR' })}
                      className="accent-slate-900"
                    />
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Active On Floor (On Duty)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'OFF_SHIFT'}
                      onChange={() => setFormData({ ...formData, status: 'OFF_SHIFT' })}
                      className="accent-slate-900"
                    />
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Off Shift / Standby
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Credentials & Multi-Role Permissions */}
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-amber-600" />
                  <span>2. Login Pass & RBAC Permissions</span>
                </h4>
                <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Portal: /login
                </span>
              </div>

              {/* Login Credentials Box */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Username */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Username (Login ID)
                    </label>
                    <div className="relative">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="ramesh.patel"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Work Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="ramesh@printbazzar.com"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                        className="text-[10px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>Generate</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Admin@12345"
                        className="w-full pl-3 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showFormPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Mobile Phone
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98000 00000"
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
                    <input
                      type="checkbox"
                      checked={formData.loginEnabled}
                      onChange={(e) => setFormData({ ...formData, loginEnabled: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 accent-slate-900"
                    />
                    <span className="font-medium text-[11.5px]">Enable login & auto workstation routing</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Default: Admin@12345</span>
                </div>
              </div>

              {/* Multi-Role Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Assigned Roles (Multi-Role RBAC) *
                  </label>
                  <span className="text-[11px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {formData.roles.length} {formData.roles.length === 1 ? 'Role' : 'Roles'} Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
                  {AVAILABLE_ROLES.map((role) => {
                    const isSelected = formData.roles.includes(role.id);
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => handleToggleRole(role.id)}
                        className={`flex items-center justify-between p-2 rounded-lg text-left text-xs transition border ${
                          isSelected
                            ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="min-w-0 pr-1">
                          <div className="font-semibold leading-tight truncate">{role.label}</div>
                          <div
                            className={`text-[9.5px] font-mono mt-0.5 truncate ${
                              isSelected ? 'text-amber-300' : 'text-slate-400'
                            }`}
                          >
                            {role.id}
                          </div>
                        </div>
                        <div
                          className={`h-4 w-4 rounded flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-amber-400 border-amber-400 text-slate-950'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5 text-amber-300" />
              <span>{isSubmitting ? 'Saving...' : editingStaffId ? 'Update Assignment & Login' : 'Assign to Shift & Save Login'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Employee Credentials Pass Modal */}
      <Modal
        isOpen={!!credentialsStaff}
        onClose={() => setCredentialsStaff(null)}
        title="Employee Login & Workstation Credentials"
        subtitle="Credentials used by this operator to log in at /login and access their assigned plant workstation."
        maxWidth="md"
      >
        {credentialsStaff && (
          <div className="space-y-4">
            {/* Operator Card */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900 text-white rounded-xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-400 text-slate-950 font-bold flex items-center justify-center text-sm">
                  {credentialsStaff.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">{credentialsStaff.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                    <span className="font-mono text-amber-300">{credentialsStaff.id}</span>
                    <span>•</span>
                    <span>{credentialsStaff.department}</span>
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                ACTIVE
              </span>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              {/* Email / Login Identifier */}
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Login Email / Username
                </label>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs text-slate-900">
                  <span className="select-all font-semibold">{credentialsStaff.email}</span>
                  <button
                    onClick={() => handleCopyText(credentialsStaff.email, 'email')}
                    className="p-1 text-slate-400 hover:text-slate-800 transition"
                    title="Copy Email"
                  >
                    {copyFeedback === 'email' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    onClick={() => setShowCredPassword(!showCredPassword)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    {showCredPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    <span>{showCredPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg p-2 font-mono text-xs text-slate-900">
                  <span className="font-semibold select-all">
                    {showCredPassword ? credentialsStaff.password || 'Admin@12345' : '••••••••••••'}
                  </span>
                  <button
                    onClick={() =>
                      handleCopyText(credentialsStaff.password || 'Admin@12345', 'pass')
                    }
                    className="p-1 text-slate-400 hover:text-slate-800 transition"
                    title="Copy Password"
                  >
                    {copyFeedback === 'pass' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Assigned Station & Destination */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-500">Assigned Station:</span>
                <span className="font-semibold text-slate-900">{credentialsStaff.station}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const payload = `PRINT BAZZAR 2.0 - EMPLOYEE CREDENTIALS\nName: ${credentialsStaff.name} (${credentialsStaff.id})\nLogin Email: ${credentialsStaff.email}\nPassword: ${credentialsStaff.password || 'Admin@12345'}\nWorkstation: ${credentialsStaff.station}\nLogin Portal: http://localhost:3000/login`;
                  handleCopyText(payload, 'all');
                }}
                className="w-full sm:w-1/2 py-2 text-xs font-semibold border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition flex items-center justify-center gap-1.5"
              >
                {copyFeedback === 'all' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Credentials Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy All Info</span>
                  </>
                )}
              </button>

              <Link
                href="/login"
                target="_blank"
                className="w-full sm:w-1/2 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5 text-amber-300" />
                <span>Go to Login Portal</span>
              </Link>
            </div>
          </div>
        )}
      </Modal>

      {/* 7. Delete Confirmation Modal */}
      <Modal
        isOpen={!!staffToDelete}
        onClose={() => setStaffToDelete(null)}
        title="Remove Operator from Shift Roster"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900 leading-relaxed">
              Are you sure you want to remove{' '}
              <strong className="font-bold text-red-950">
                {staffToDelete?.name} ({staffToDelete?.id})
              </strong>{' '}
              from the active shift roster? This will deallocate their current workstation assignment.
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setStaffToDelete(null)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-xs flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Confirm Delete</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
