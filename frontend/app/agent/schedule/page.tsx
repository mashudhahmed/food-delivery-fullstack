'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { Calendar, Clock, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'active' | 'completed' | 'cancelled';
}

export default function AgentSchedulePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([
    { id: '1', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '14:00', status: 'active' },
    { id: '2', date: new Date().toISOString().split('T')[0], startTime: '16:00', endTime: '20:00', status: 'active' },
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newShift, setNewShift] = useState({ date: '', startTime: '', endTime: '' });

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'agent') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    setLoading(false);
  }, []);

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

  const getShiftsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.filter((s) => s.date === dateStr);
  };

  const addShift = () => {
    if (!newShift.date || !newShift.startTime || !newShift.endTime) {
      toast.error('Please fill all fields');
      return;
    }
    setShifts([...shifts, { ...newShift, id: Date.now().toString(), status: 'active' }]);
    setShowAddModal(false);
    setNewShift({ date: '', startTime: '', endTime: '' });
    toast.success('Shift added successfully');
  };

  const upcomingShifts = shifts.filter((s) => new Date(s.date) >= new Date());
  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="h-96 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your availability and shifts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition shadow-sm shadow-orange-200 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Shift</span>
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden mb-6">
        <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-lg transition">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <h2 className="text-sm font-semibold text-gray-800">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-lg transition">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-gray-50/80 p-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100">
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white p-3 min-h-24" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayShifts = getShiftsForDay(day);
            return (
              <div key={day} className="bg-white p-2.5 min-h-24 hover:bg-orange-50/50 transition-colors">
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    isToday(day)
                      ? 'bg-orange-500 text-white'
                      : dayShifts.length > 0
                      ? 'text-orange-600 font-semibold'
                      : 'text-gray-500'
                  }`}
                >
                  {day}
                </span>
                <div className="space-y-1 mt-1.5">
                  {dayShifts.map((shift) => (
                    <div key={shift.id} className="px-1.5 py-1 bg-orange-50 rounded-lg text-[11px] text-orange-700 font-medium truncate">
                      {shift.startTime}–{shift.endTime}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Shifts */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Upcoming Shifts</h3>
          <p className="text-sm text-gray-500 mt-1">Your scheduled delivery times</p>
        </div>
        <div className="divide-y divide-gray-50">
          {upcomingShifts.map((shift) => (
            <div key={shift.id} className="p-4 flex justify-between items-center hover:bg-gray-50/60 transition-colors">
              <div className="flex items-center gap-3.5">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 text-orange-600">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <p className="font-medium text-sm text-gray-800">{new Date(shift.date).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-400">
                    {shift.startTime} - {shift.endTime}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200">
                Scheduled
              </span>
            </div>
          ))}
          {upcomingShifts.length === 0 && (
            <div className="text-center py-16">
              <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">No upcoming shifts</p>
              <p className="text-xs text-gray-400 mt-1">Add a shift to plan your availability.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Add New Shift</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={newShift.date}
                  onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
                <input
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time</label>
                <input
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={addShift}
                  className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-orange-600 transition shadow-sm shadow-orange-200"
                >
                  Add Shift
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}