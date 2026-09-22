import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  Search, 
  Download, 
  Trash2, 
  Clock, 
  User, 
  FileText, 
  Key, 
  ArrowDownUp, 
  CheckCircle,
  Filter
} from 'lucide-react';
import { AuditLogEntry } from '../../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  onClearLogs?: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs
}) => {
  const [search, setSearch] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filterAction === 'ALL' || log.action === filterAction;
    if (!matchesAction) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.performedBy.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.entityName && log.entityName.toLowerCase().includes(q)) ||
      log.action.toLowerCase().includes(q)
    );
  });

  const handleExportCsv = () => {
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Performed By', 'Details'];
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.timestamp).toLocaleString('en-GB')}"`,
      `"${l.action}"`,
      `"${l.entityType}"`,
      `"${l.performedBy.replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DocVault_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333]">CREATE</span>;
      case 'VERSION_UPLOAD':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f0fe] text-[#1a73e8]">NEW VERSION</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fef7e0] text-[#b06000]">UPDATE</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fce8e6] text-[#c5221f]">DELETE</span>;
      case 'RESTORE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3e8fd] text-[#7627bb]">RESTORE</span>;
      case 'SHARE_CREATE':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f0fe] text-[#1a73e8]">SHARE LINK</span>;
      case 'BACKUP_EXPORT':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e6f4ea] text-[#137333]">BACKUP</span>;
      case 'STAFF_LOGIN':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f8fafd] text-[#5f6368] border border-gray-300">STAFF LOGIN</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">{action}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#dadce0] rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between bg-gradient-to-r from-[#e8f0fe]/60 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">
                  Compliance &amp; Security Audit Trail
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8]">
                  {logs.length} logged events
                </span>
              </div>
              <p className="text-xs text-[#5f6368] mt-0.5">
                Immutable chronological log of document operations, client shares, logins, and backups.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f1f3f4] text-[#202124] border border-[#dadce0] rounded-xl text-xs font-semibold transition-colors shadow-2xs"
              title="Download audit trail as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-2.5 bg-[#f8fafd] border-b border-[#dadce0] flex items-center justify-between gap-3 flex-shrink-0 flex-wrap text-xs">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, action, details..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dadce0] focus:border-[#1a73e8] rounded-xl text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[#5f6368]" />
            <span className="font-semibold text-[#5f6368]">Action:</span>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-white border border-[#dadce0] rounded-xl px-2.5 py-1 font-medium text-[#202124] outline-none text-xs"
            >
              <option value="ALL">All Actions</option>
              <option value="CREATE">Document Created</option>
              <option value="VERSION_UPLOAD">New Version Uploaded</option>
              <option value="DELETE">Deleted</option>
              <option value="RESTORE">Restored</option>
              <option value="SHARE_CREATE">Share Link Created</option>
              <option value="BACKUP_EXPORT">Backup Exported</option>
              <option value="STAFF_LOGIN">Staff Login</option>
            </select>
          </div>
        </div>

        {/* Table of logs */}
        <div className="flex-1 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="py-20 text-center text-[#5f6368]">
              <Clock className="w-12 h-12 text-[#dadce0] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#202124]">No audit entries match filter</p>
              <p className="text-xs text-[#5f6368] mt-1">Actions performed across the system will be recorded here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f8fafd] border-b border-[#dadce0] text-[#5f6368] font-semibold sticky top-0">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Performed By</th>
                  <th className="py-2.5 px-4">Entity / Target</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#dadce0]">
                {filteredLogs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  });

                  return (
                    <tr key={log.id} className="hover:bg-[#f8fafd] transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-[#5f6368] font-mono text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-[#202124]">
                        {log.performedBy}
                      </td>
                      <td className="py-2.5 px-4 text-[#1a73e8] font-medium max-w-[140px] truncate" title={log.entityName || ''}>
                        {log.entityName || log.entityType}
                      </td>
                      <td className="py-2.5 px-4 text-[#5f6368] max-w-[280px] truncate" title={log.details || ''}>
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#f8fafd] border-t border-[#dadce0] flex items-center justify-between text-xs text-[#5f6368] flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-[#137333]" />
            <span>Audit logs are preserved locally and backed up in master JSON archives.</span>
          </div>

          <div className="flex items-center gap-2">
            {onClearLogs && logs.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Clear audit history log on this device?')) {
                    onClearLogs();
                  }
                }}
                className="px-3 py-1.5 text-xs text-[#5f6368] hover:text-[#d93025] transition-colors"
              >
                Clear History
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl font-semibold transition-colors shadow-2xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
