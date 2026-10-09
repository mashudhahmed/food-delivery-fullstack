'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, AuthUser } from '@/lib/auth';
import {
  Calendar,
  Clock,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Zap,
  CheckCircle2,
  Sparkles,
  Flame,
  ArrowRight,
  Moon,
  SunMedium,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Shift {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: 'active' | 'completed' | 'cancelled';
  note?: string;
}

const PRESET_SHIFTS = [
  {
    name: 'Lunch Rush',
    icon: Flame,
    color: 'from-amber-500 to-orange-500',
    startTime: '11:30',
    endTime: '15:00',
    tag: 'High Order Volume',
  },
  {
    name: 'Dinner Peak',
    icon: Zap,
    color: 'from-orange-500 to-red-500',
    startTime: '18:00',
    endTime: '22:30',
    tag: 'Highest Payouts',
  },
  {
    name: 'Full Day',
    icon: SunMedium,
    color: 'from-blue-500 to-indigo-500',
    startTime: '10:00',
    endTime: '19:00',
    tag: 'Full Coverage',
  },
  {
    name: 'Late Night',
    icon: Moon,
    color: 'from-purple-500 to-indigo-600',
    startTime: '22:00',
    endTime: '02:00',
    tag: 'Night Owl Bonus',
  },
];

function calculateShiftHours(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  let diff = (endH * 60 + (endM || 0)) - (startH * 60 + (startM || 0));
  if (diff <= 0) {
    diff += 24 * 60; // Overnight shift
  }
  return Math.round((diff / 60) * 10) / 10;
}

function formatDateString(dateStr: string): string {
  try {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';

    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default function AgentSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDayForAdd, setSelectedDayForAdd] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'all'>('upcoming');

  const [newShift, setNewShift] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '11:30',
    endTime: '15:00',
    note: 'Lunch Rush',
  });

  // Storage key helper
  const getStorageKey = (userId?: string) => `agent_shifts_${userId || 'default'}`;

  // Initial Auth & Load shifts
  useEffect(() => {
    let isMounted = true;
    const currentUser = auth.getCurrentUser();

    if (!currentUser || currentUser.role !== 'agent') {
      router.push('/');
      return;
    }

    if (isMounted) {
      setUser(currentUser);
      const storageKey = getStorageKey(currentUser.id);
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setShifts(parsed);
          }
        } catch {
          // Ignore invalid parse
        }
      } else {
        // Seed initial shifts for today & tomorrow
        const todayStr = new Date().toISOString().split('T')[0];
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const initialShifts: Shift[] = [
          { id: 'shift-1', date: todayStr, startTime: '11:30', endTime: '15:00', status: 'active', note: 'Lunch Rush' },
          { id: 'shift-2', date: todayStr, startTime: '18:00', endTime: '22:00', status: 'active', note: 'Dinner Peak' },
          { id: 'shift-3', date: tomorrowStr, startTime: '12:00', endTime: '16:00', status: 'active', note: 'Afternoon' },
        ];
        setShifts(initialShifts);
        localStorage.setItem(storageKey, JSON.stringify(initialShifts));
      }

      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Sync shifts to localStorage
  const saveShifts = (updatedShifts: Shift[]) => {
    setShifts(updatedShifts);
    if (user?.id) {
      localStorage.setItem(getStorageKey(user.id), JSON.stringify(updatedShifts));
    }
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek };
  };

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDayDateStr = (day: number) => {
    return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const getShiftsForDay = (day: number) => {
    const dateStr = getDayDateStr(day);
    return shifts.filter((s) => s.date === dateStr);
  };

  const openAddForDate = (dateStr: string) => {
    setNewShift((prev) => ({
      ...prev,
      date: dateStr,
    }));
    setSelectedDayForAdd(dateStr);
    setShowAddModal(true);
  };

  const addShift = () => {
    if (!newShift.date || !newShift.startTime || !newShift.endTime) {
      toast.error('Please enter a valid date and time range');
      return;
    }

    const created: Shift = {
      id: `shift-${Date.now()}`,
      date: newShift.date,
      startTime: newShift.startTime,
      endTime: newShift.endTime,
      status: 'active',
      note: newShift.note || 'Custom Shift',
    };

    const updated = [...shifts, created].sort((a, b) => {
      const compDate = a.date.localeCompare(b.date);
      if (compDate !== 0) return compDate;
      return a.startTime.localeCompare(b.startTime);
    });

    saveShifts(updated);
    setShowAddModal(false);
    toast.success('Shift added to your schedule');
  };

  const deleteShift = (id: string) => {
    const shiftToDelete = shifts.find((s) => s.id === id);
    const updated = shifts.filter((s) => s.id !== id);
    saveShifts(updated);
    toast.success(`Shift on ${formatDateString(shiftToDelete?.date || '')} removed`);
  };

  // Metrics computation
  const todayStr = new Date().toISOString().split('T')[0];

  const totalWeeklyHours = useMemo(() => {
    // Sum hours for shifts within the next 7 days or today
    const now = new Date();
    const sevenDaysLater = new Date(Date.now() + 7 * 86400000);
    return shifts
      .filter((s) => {
        const d = new Date(s.date + 'T00:00:00');
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && d <= sevenDaysLater;
      })
      .reduce((sum, s) => sum + calculateShiftHours(s.startTime, s.endTime), 0);
  }, [shifts]);

  const upcomingShifts = useMemo(() => {
    return shifts
      .filter((s) => s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [shifts, todayStr]);

  const activeTodayShift = useMemo(() => {
    const todayShifts = shifts.filter((s) => s.date === todayStr);
    if (todayShifts.length === 0) return null;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // Check if right now is within any shift
    for (const s of todayShifts) {
      const [startH, startM] = s.startTime.split(':').map(Number);
      const [endH, endM] = s.endTime.split(':').map(Number);
      const startMins = startH * 60 + startM;
      let endMins = endH * 60 + endM;
      if (endMins < startMins) endMins += 24 * 60;

      if (currentMins >= startMins && currentMins <= endMins) {
        return { shift: s, isLive: true };
      }
    }

    // Otherwise next upcoming shift today
    const futureToday = todayShifts
      .filter((s) => {
        const [startH, startM] = s.startTime.split(':').map(Number);
        return startH * 60 + startM > currentMins;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

    if (futureToday) {
      return { shift: futureToday, isLive: false };
    }

    return null;
  }, [shifts, todayStr]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-gray-100 rounded-2xl border border-gray-100" />
          <div className="h-28 bg-gray-100 rounded-2xl border border-gray-100" />
          <div className="h-28 bg-gray-100 rounded-2xl border border-gray-100" />
        </div>
        <div className="h-96 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <Calendar className="w-7 h-7 text-orange-500" />
            Courier Shift Schedule
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Reserve peak hours, track weekly planned hours, and maximize delivery rewards.
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => {
              openAddForDate(todayStr);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 active:scale-[0.98] transition shadow-md shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Shift
          </button>
          <Link
            href="/agent/available"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition shadow-md shadow-emerald-600/20"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden md:inline">Go On Duty</span>
          </Link>
        </div>
      </div>

      {/* Live Status Hero Banner */}
      {activeTodayShift?.isLive ? (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg shadow-emerald-600/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <span className="relative flex h-4 w-4 mt-1 sm:mt-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-100"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  Shift Active Now
                </span>
                <span className="text-xs text-emerald-100 font-medium">
                  {activeTodayShift.shift.note || 'Scheduled Shift'}
                </span>
              </div>
              <p className="text-lg font-bold mt-1">
                You are on shift: {activeTodayShift.shift.startTime} – {activeTodayShift.shift.endTime} (
                {calculateShiftHours(activeTodayShift.shift.startTime, activeTodayShift.shift.endTime)} hrs)
              </p>
            </div>
          </div>
          <Link
            href="/agent/available"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-emerald-800 text-sm font-bold rounded-xl hover:bg-emerald-50 active:scale-95 transition shrink-0"
          >
            Accept Orders Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : activeTodayShift && !activeTodayShift.isLive ? (
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-4 sm:p-5 shadow-md shadow-orange-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-amber-200 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-100">Upcoming Today</p>
              <p className="text-sm sm:text-base font-semibold">
                Shift starts at {activeTodayShift.shift.startTime} until {activeTodayShift.shift.endTime} (
                {activeTodayShift.shift.note || 'Scheduled'})
              </p>
            </div>
          </div>
          <Link
            href="/agent/available"
            className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3.5 py-2 rounded-xl transition inline-flex items-center justify-center gap-1.5"
          >
            Open Order Radar
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : null}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scheduled (7 Days)</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{totalWeeklyHours} hrs</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Recommended: 25-40 hrs</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Upcoming Shifts</p>
            <p className="text-2xl font-black text-gray-900 mt-0.5">{upcomingShifts.length} shifts</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Across this & next week</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Est. Earning Potential</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">
              ৳{(totalWeeklyHours * 220).toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">Based on ৳220/hr average</p>
          </div>
        </div>
      </div>

      {/* Preset Peak Hour Quick Add Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-bold text-gray-900">1-Click Peak Hour Presets</h2>
          </div>
          <span className="text-xs text-gray-400">Click to schedule today</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PRESET_SHIFTS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.name}
                onClick={() => {
                  setNewShift({
                    date: todayStr,
                    startTime: preset.startTime,
                    endTime: preset.endTime,
                    note: preset.name,
                  });
                  setSelectedDayForAdd(todayStr);
                  setShowAddModal(true);
                }}
                className="group p-3.5 rounded-xl border border-gray-200/80 hover:border-orange-300 hover:bg-orange-50/40 text-left transition relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-800 group-hover:text-orange-600 transition">
                    {preset.name}
                  </span>
                  <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 group-hover:scale-110 transition">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xs font-semibold text-gray-600 font-mono">
                  {preset.startTime} – {preset.endTime}
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-orange-600 font-medium">
                  <span>{preset.tag}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Month Navigation */}
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition text-gray-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-orange-500" />
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition text-gray-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="bg-gray-50 p-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white/60 p-3 min-h-[96px]" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = getDayDateStr(day);
            const dayShifts = getShiftsForDay(day);
            const isTodayDate = isToday(day);

            return (
              <div
                key={day}
                onClick={() => openAddForDate(dateStr)}
                className={`group bg-white p-2 sm:p-2.5 min-h-[105px] hover:bg-orange-50/40 transition-colors cursor-pointer relative flex flex-col justify-between ${
                  isTodayDate ? 'ring-2 ring-inset ring-orange-400 bg-orange-50/10' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        isTodayDate
                          ? 'bg-orange-500 text-white shadow-sm'
                          : dayShifts.length > 0
                          ? 'text-orange-600 bg-orange-50'
                          : 'text-gray-600'
                      }`}
                    >
                      {day}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddForDate(dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-orange-600 rounded transition"
                      title="Add shift on this day"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Day Shifts */}
                  <div className="space-y-1 mt-1.5">
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="px-1.5 py-0.5 bg-orange-100/70 border border-orange-200/80 rounded-md text-[10px] font-semibold text-orange-900 truncate flex items-center justify-between"
                      >
                        <span className="truncate">
                          {shift.startTime}–{shift.endTime}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {dayShifts.length > 0 && (
                  <div className="text-[10px] font-bold text-gray-400 text-right mt-1">
                    {dayShifts.reduce((acc, s) => acc + calculateShiftHours(s.startTime, s.endTime), 0)}h
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shifts Ledger & Upcoming Shifts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Your Scheduled Shifts</h3>
            <p className="text-xs text-gray-500 mt-0.5">Manage and cancel your active delivery reservations</p>
          </div>
          <div className="flex bg-gray-100 p-0.5 rounded-xl text-xs font-medium self-stretch sm:self-auto">
            <button
              onClick={() => setActiveFilter('upcoming')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition ${
                activeFilter === 'upcoming'
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Upcoming ({upcomingShifts.length})
            </button>
            <button
              onClick={() => setActiveFilter('all')}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition ${
                activeFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-xs font-bold'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All Shifts ({shifts.length})
            </button>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {(activeFilter === 'upcoming' ? upcomingShifts : shifts).map((shift) => {
            const shiftHours = calculateShiftHours(shift.startTime, shift.endTime);
            const isTodayShift = shift.date === todayStr;

            return (
              <div
                key={shift.id}
                className="p-4 sm:px-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-gray-50/70 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      isTodayShift ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-gray-900">{formatDateString(shift.date)}</p>
                      {shift.note && (
                        <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {shift.note}
                        </span>
                      )}
                      {isTodayShift && (
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {shift.startTime} – {shift.endTime} ({shiftHours} hrs)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <CheckCircle2 className="w-3 h-3" />
                    Confirmed
                  </span>

                  {isTodayShift && (
                    <Link
                      href="/agent/available"
                      className="px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs font-semibold transition"
                    >
                      Start
                    </Link>
                  )}

                  <button
                    onClick={() => deleteShift(shift.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Cancel Shift"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {(activeFilter === 'upcoming' ? upcomingShifts : shifts).length === 0 && (
            <div className="text-center py-16 px-4">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-base font-bold text-gray-800">No shifts found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Schedule your upcoming delivery hours to stay active and get prioritized delivery dispatching.
              </p>
              <button
                onClick={() => openAddForDate(todayStr)}
                className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition"
              >
                Schedule Shift Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h2 className="text-lg font-black text-gray-900">Schedule Delivery Shift</h2>
                <p className="text-xs text-gray-500 mt-0.5">Select a peak preset or define custom delivery hours</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-200/60 rounded-xl transition text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Presets Quick Picker */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Quick Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_SHIFTS.map((p) => {
                    const isSelected = newShift.startTime === p.startTime && newShift.endTime === p.endTime;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() =>
                          setNewShift((prev) => ({
                            ...prev,
                            startTime: p.startTime,
                            endTime: p.endTime,
                            note: p.name,
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50 text-orange-950 font-bold'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{p.name}</div>
                          <div className="text-[10px] text-gray-500">
                            {p.startTime} – {p.endTime}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-orange-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Shift Date
                </label>
                <input
                  type="date"
                  value={newShift.date}
                  onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-medium"
                />
              </div>

              {/* Times Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition font-medium"
                  />
                </div>
              </div>

              {/* Note / Label */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Shift Note / Zone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dhanmondi Hub, Lunch Rush"
                  value={newShift.note}
                  onChange={(e) => setNewShift({ ...newShift, note: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                />
              </div>

              {/* Shift Length Calculation Card */}
              <div className="bg-orange-50/70 border border-orange-200/60 p-3.5 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-orange-900 font-semibold">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>Duration: {calculateShiftHours(newShift.startTime, newShift.endTime)} Hours</span>
                </div>
                <span className="text-[11px] text-orange-700 font-medium">
                  Est. ৳{(calculateShiftHours(newShift.startTime, newShift.endTime) * 220).toFixed(0)} payout
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-200 text-gray-700 text-sm font-semibold py-3 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={addShift}
                  className="flex-1 bg-orange-500 text-white text-sm font-bold py-3 rounded-xl hover:bg-orange-600 active:scale-[0.98] transition shadow-md shadow-orange-500/20"
                >
                  Save Shift
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}