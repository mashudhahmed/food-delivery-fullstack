'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  History,
  RefreshCw,
  ShoppingBag,
  UserPlus,
  Shield,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Globe,
  Radio,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  resource: string;
  resourceId: string;
  message: string;
  actorName: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  wasSuccessful: boolean;
  errorMessage?: string | null;
  changes?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  timestamp: string;
  icon?: string;
}

export default function ActivityPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isLive, setIsLive] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    fetchActivity();
  }, []);

  // Live feed polling
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchActivitySilently();
    }, 15000);
    return () => clearInterval(interval);
  }, [isLive]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/activity?limit=50');
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setActivities(data);
    } catch {
      toast.error('Failed to load activity logs');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivitySilently = async () => {
    try {
      const response = await api.get('/admin/activity?limit=50');
      const data = Array.isArray(response.data) ? response.data : response.data?.data || [];
      setActivities(data);
    } catch {
      // silent
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} copied to clipboard`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getEventMeta = (type: string, action: string) => {
    if (type === 'order' || action.includes('ORDER')) {
      return {
        icon: <ShoppingBag className="w-4 h-4 text-orange-600" />,
        bg: 'bg-orange-50 border-orange-200',
        badge: 'bg-orange-50 text-orange-700 ring-orange-200',
        category: 'Order Event',
      };
    }
    if (type === 'user' || action.includes('USER')) {
      return {
        icon: <UserPlus className="w-4 h-4 text-purple-600" />,
        bg: 'bg-purple-50 border-purple-200',
        badge: 'bg-purple-50 text-purple-700 ring-purple-200',
        category: 'User Event',
      };
    }
    return {
      icon: <Shield className="w-4 h-4 text-blue-600" />,
      bg: 'bg-blue-50 border-blue-200',
      badge: 'bg-blue-50 text-blue-700 ring-blue-200',
      category: 'System / Security',
    };
  };

  const filtered = useMemo(() => {
    return activities.filter((act) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        act.message?.toLowerCase().includes(term) ||
        act.actorName?.toLowerCase().includes(term) ||
        act.action?.toLowerCase().includes(term) ||
        act.resourceId?.toLowerCase().includes(term) ||
        act.resource?.toLowerCase().includes(term);

      const matchesType = filterType === 'all' || act.type === filterType;
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'success' && act.wasSuccessful) ||
        (filterStatus === 'failed' && !act.wasSuccessful);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [activities, searchTerm, filterType, filterStatus]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs & Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time trace of administrative operations, security audits, and system lifecycle events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-2 text-sm font-medium rounded-xl flex items-center gap-2 transition ${
              isLive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Radio className={`w-4 h-4 ${isLive ? 'animate-pulse text-emerald-600' : 'text-gray-400'}`} />
            <span>{isLive ? 'Live Stream (15s)' : 'Live Stream'}</span>
          </button>
          <button
            onClick={fetchActivity}
            className="px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by action, user, order, or IP address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="audit">Admin & Security Audits</option>
            <option value="order">Order Events</option>
            <option value="user">User & Roles</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer"
          >
            <option value="all">All Outcomes</option>
            <option value="success">Successful Only</option>
            <option value="failed">Failed / Errors Only</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-50 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <History className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No activity logs found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria or filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map((item) => {
              const meta = getEventMeta(item.type, item.action);
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedActivity(item)}
                  className="p-4 sm:p-5 flex items-start gap-4 hover:bg-gray-50/70 transition-colors cursor-pointer group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${meta.bg}`}>
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ring-1 ring-inset ${meta.badge}`}
                        >
                          {item.action || 'ACTION'}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                          {item.message}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                        {item.timestamp ? new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 flex-wrap">
                      <span className="font-medium text-gray-700">
                        Actor: <span className="text-gray-900">{item.actorName || 'System'}</span>
                      </span>
                      {item.actorRole && (
                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-semibold text-gray-600 uppercase">
                          {item.actorRole}
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        Resource: <span className="font-mono text-gray-700">{item.resource}</span>
                      </span>
                      {item.ipAddress && item.ipAddress !== 'N/A' && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-gray-400">{item.ipAddress}</span>
                        </>
                      )}
                      <span>•</span>
                      {item.wasSuccessful ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedActivity(item);
                      }}
                      className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition"
                      title="Inspect event details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comprehensive Audit Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                    getEventMeta(selectedActivity.type, selectedActivity.action).bg
                  }`}
                >
                  {getEventMeta(selectedActivity.type, selectedActivity.action).icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700 uppercase tracking-wider">
                      {selectedActivity.action}
                    </span>
                    {selectedActivity.wasSuccessful ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Successful
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-50 text-red-700 font-medium">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-gray-900 mt-1 leading-snug">{selectedActivity.message}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedActivity(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message Alert (if any) */}
            {selectedActivity.errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs mb-4 flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Execution Error</p>
                  <p className="mt-0.5">{selectedActivity.errorMessage}</p>
                </div>
              </div>
            )}

            {/* Event Telemetry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="p-3.5 bg-gray-50 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>Timestamp</span>
                </div>
                <p className="font-semibold text-gray-800">
                  {selectedActivity.timestamp ? new Date(selectedActivity.timestamp).toLocaleString() : 'N/A'}
                </p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  <span>IP Address & Network</span>
                </div>
                <p className="font-mono font-semibold text-gray-800">{selectedActivity.ipAddress || '127.0.0.1'}</p>
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                  <UserPlus className="w-3.5 h-3.5 text-gray-400" />
                  <span>Actor / Operator</span>
                </div>
                <p className="font-semibold text-gray-800">
                  {selectedActivity.actorName} {selectedActivity.actorRole ? `(${selectedActivity.actorRole})` : ''}
                </p>
                {selectedActivity.actorEmail && (
                  <p className="text-gray-500 truncate">{selectedActivity.actorEmail}</p>
                )}
              </div>

              <div className="p-3.5 bg-gray-50 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                  <FileText className="w-3.5 h-3.5 text-gray-400" />
                  <span>Target Resource</span>
                </div>
                <p className="font-semibold text-gray-800 uppercase tracking-wider">{selectedActivity.resource}</p>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-gray-600 truncate">{selectedActivity.resourceId}</span>
                  <button
                    onClick={() => copyToClipboard(selectedActivity.resourceId, 'Resource ID')}
                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600"
                    title="Copy resource ID"
                  >
                    {copiedField === 'Resource ID' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* User Agent / Request ID */}
            {selectedActivity.userAgent && (
              <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 mb-4 flex items-start gap-2">
                <Laptop className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span className="font-mono break-all">{selectedActivity.userAgent}</span>
              </div>
            )}

            {/* Changes & Payload JSON Inspector */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Audit Payload & State Changes
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          changes: selectedActivity.changes,
                          metadata: selectedActivity.metadata,
                        },
                        null,
                        2,
                      ),
                      'JSON Payload',
                    )
                  }
                  className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
                >
                  {copiedField === 'JSON Payload' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy JSON
                </button>
              </div>

              <div className="bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-60 border border-slate-800">
                <pre>
                  {JSON.stringify(
                    {
                      changes: selectedActivity.changes || 'No recorded state diff',
                      metadata: selectedActivity.metadata || {},
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              {selectedActivity.resource === 'order' && selectedActivity.resourceId ? (
                <button
                  onClick={() => router.push(`/orders/${selectedActivity.resourceId}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-xl transition"
                >
                  <span>View Order Details</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedActivity(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
