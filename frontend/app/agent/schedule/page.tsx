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
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getShiftsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return shifts.filter(s => s.date === dateStr);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Delivery Schedule</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your availability and shifts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
        >
          <Plus className="w-4 h-4" />
          Add Shift
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white p-4 min-h-25" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayShifts = getShiftsForDay(day);
            return (
              <div key={day} className="bg-white p-3 min-h-25 hover:bg-orange-50 transition">
                <span className={`text-sm font-medium ${dayShifts.length > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                  {day}
                </span>
                {dayShifts.map((shift) => (
                  <div key={shift.id} className="mt-1 p-1 bg-orange-100 rounded text-xs text-orange-700">
                    {shift.startTime} - {shift.endTime}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Shifts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Upcoming Shifts</h3>
          <p className="text-sm text-gray-500 mt-1">Your scheduled delivery times</p>
        </div>
        <div className="divide-y divide-gray-100">
          {shifts.filter(s => new Date(s.date) >= new Date()).map((shift) => (
            <div key={shift.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{new Date(shift.date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">{shift.startTime} - {shift.endTime}</p>
                </div>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Scheduled
              </span>
            </div>
          ))}
          {shifts.filter(s => new Date(s.date) >= new Date()).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              No upcoming shifts
            </div>
          )}
        </div>
      </div>

      {/* Add Shift Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Add New Shift</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newShift.date}
                  onChange={(e) => setNewShift({ ...newShift, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={newShift.startTime}
                  onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={newShift.endTime}
                  onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={addShift}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition"
                >
                  Add Shift
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition"
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