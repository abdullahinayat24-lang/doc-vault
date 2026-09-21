import React, { useState, useMemo } from 'react';
import { 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  Users, 
  Briefcase, 
  PoundSterling, 
  Search, 
  ArrowUpDown, 
  Plus, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Share2, 
  Trash2, 
  UserPlus, 
  FolderOpen,
  Filter,
  Check,
  Palette,
  X,
  UserCheck,
  Sparkles,
  Edit2,
  TrendingUp
} from 'lucide-react';
import { ClientRecord, SolicitorProfile, CollectionTab, DocumentItem, ClientPriority, StaffMember, StaffRole } from '../types';

export const FIRM_THEMES = [
  { id: 'royal_blue', name: 'Royal Legal Blue', hex: '#1a73e8', gradient: 'from-[#1a73e8] to-[#1557b0]', lightBg: '#e8f0fe', badgeText: '#1a73e8' },
  { id: 'navy', name: 'Chambers Navy', hex: '#1e3a8a', gradient: 'from-[#1e3a8a] to-[#172554]', lightBg: '#eff6ff', badgeText: '#1e3a8a' },
  { id: 'slate', name: 'Charcoal Slate', hex: '#334155', gradient: 'from-[#334155] to-[#0f172a]', lightBg: '#f1f5f9', badgeText: '#334155' },
  { id: 'emerald', name: 'Barristers Emerald', hex: '#065f46', gradient: 'from-[#065f46] to-[#022c22]', lightBg: '#ecfdf5', badgeText: '#065f46' },
  { id: 'burgundy', name: 'High Court Burgundy', hex: '#881337', gradient: 'from-[#881337] to-[#4c0519]', lightBg: '#ffe4e6', badgeText: '#881337' },
  { id: 'violet', name: 'Corporate Violet', hex: '#4c1d95', gradient: 'from-[#4c1d95] to-[#2e1065]', lightBg: '#f3e8ff', badgeText: '#4c1d95' },
  { id: 'bronze', name: 'Warm Bronze', hex: '#78350f', gradient: 'from-[#78350f] to-[#451a03]', lightBg: '#fef3c7', badgeText: '#78350f' },
];

interface CompanyDashboardProps {
  solicitor: SolicitorProfile;
  clients: ClientRecord[];
  tabs: CollectionTab[];
  documents: DocumentItem[];
  staffList?: StaffMember[];
  onSelectClient: (client: ClientRecord) => void;
  onOpenNewClientModal: () => void;
  onDeleteClient: (clientId: string, e: React.MouseEvent) => void;
  onQuickShareClient: (client: ClientRecord, e: React.MouseEvent) => void;
  onEditCompanyProfile: () => void;
  onUpdateFirmTheme?: (themeColor: string) => void;
  onAddStaffMember?: (member: StaffMember) => void;
  onDeleteStaffMember?: (id: string) => void;
  onAssignStaffToClient?: (clientId: string, staffId?: string) => void;
  onEditClient?: (client: ClientRecord, e: React.MouseEvent) => void;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  solicitor,
  clients,
  tabs,
  documents,
  staffList = [],
  onSelectClient,
  onOpenNewClientModal,
  onDeleteClient,
  onQuickShareClient,
  onEditCompanyProfile,
  onUpdateFirmTheme,
  onAddStaffMember,
  onDeleteStaffMember,
  onAssignStaffToClient,
  onEditClient
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'date' | 'name' | 'priority' | 'fee'>('date');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ClientPriority>('all');
  const [staffFilter, setStaffFilter] = useState<'all' | 'unassigned' | string>('all');

  // Staff modal state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('Solicitor');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');

  const currentTheme = FIRM_THEMES.find(t => t.hex.toLowerCase() === (solicitor.firmThemeColor || '#1a73e8').toLowerCase()) || FIRM_THEMES[0];

  // Compute metrics
  const totalClients = clients.length;
  const totalVisits = clients.reduce((acc, c) => acc + (c.visitCount || 1), 0);
  const totalAskingFees = clients.reduce((acc, c) => acc + (c.totalAskingAmount || 0), 0);
  const totalDocSendingCosts = clients.reduce((acc, c) => acc + (c.totalDocCost || 0), 0);

  // Total missing/disapproved docs across all clients
  const totalMissingDocs = documents.filter(d => d.status === 'missing' || d.status === 'disapproved').length;
  const totalApprovedDocs = documents.filter(d => d.status === 'approved').length;

  // Filter and sort clients
  const filteredClients = useMemo(() => {
    return clients
      .filter((c) => {
        if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;
        if (staffFilter !== 'all') {
          if (staffFilter === 'unassigned' && c.assignedStaffId) return false;
          if (staffFilter !== 'unassigned' && c.assignedStaffId !== staffFilter) return false;
        }
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.cameFor.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortOption === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortOption === 'fee') {
          return (b.totalAskingAmount || 0) - (a.totalAskingAmount || 0);
        }
        if (sortOption === 'priority') {
          const rank = { urgent: 4, high: 3, normal: 2, low: 1 };
          return rank[b.priority] - rank[a.priority];
        }
        // Default: Date (Latest visit)
        return new Date(b.lastVisitDate).getTime() - new Date(a.lastVisitDate).getTime();
      });
  }, [clients, searchQuery, sortOption, priorityFilter, staffFilter]);

  const getPriorityBadge = (priority: ClientPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#fce8e6] text-[#d93025] border border-[#ea4335]/30">
            Urgent Priority
          </span>
        );
      case 'high':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#fce8b2]">
            High Priority
          </span>
        );
      case 'normal':
        return (
          <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8]">
            Normal
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-full bg-[#f1f3f4] text-[#5f6368]">
            Low
          </span>
        );
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="flex-1 bg-[#f8fafd] overflow-y-auto p-4 sm:p-6 lg:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Company Header Card */}
        <div className="bg-white border border-[#dadce0] rounded-3xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Company Info & Logo */}
            <div className="flex items-start gap-4">
              {solicitor.companyLogo ? (
                <img
                  src={solicitor.companyLogo}
                  alt={solicitor.companyName}
                  className="w-16 h-16 rounded-2xl object-cover border border-[#dadce0] shadow-sm flex-shrink-0"
                />
              ) : (
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentTheme.gradient} text-white flex items-center justify-center font-bold text-2xl shadow-sm ring-4 ring-blue-50 flex-shrink-0`}>
                  <Building className="w-8 h-8" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-['Google_Sans',sans-serif] text-xl sm:text-2xl font-bold text-[#202124]">
                    {solicitor.companyName}
                  </h1>
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded" style={{ backgroundColor: currentTheme.lightBg, color: currentTheme.badgeText }}>
                    Practice Hub
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-0.5">
                  Principal Solicitor: <strong className="text-[#202124]">{solicitor.displayName}</strong>
                </p>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs text-[#5f6368]">
                  {solicitor.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#1a73e8]" />
                      <span>{solicitor.phone}</span>
                    </span>
                  )}
                  {solicitor.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#1a73e8]" />
                      <span>{solicitor.email}</span>
                    </span>
                  )}
                  {solicitor.address && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#1a73e8]" />
                      <span>{solicitor.address}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Header action buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowStaffModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#e8f0fe] text-[#1a73e8] border border-[#dadce0] text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                <Users className="w-4 h-4" />
                <span>Staff Directory ({staffList.length})</span>
              </button>
              <button
                onClick={onEditCompanyProfile}
                className="px-4 py-2 border border-[#dadce0] hover:bg-[#f1f3f4] text-[#202124] text-xs font-semibold rounded-xl transition-colors shadow-xs"
              >
                Edit Firm Details
              </button>
              <button
                onClick={onOpenNewClientModal}
                style={{ backgroundColor: currentTheme.hex }}
                className="flex items-center gap-2 px-5 py-2 text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all hover:opacity-90"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Register New Client</span>
              </button>
            </div>
          </div>

          {/* Firm Theme Color Palette Selector */}
          <div className="mt-4 pt-3 border-t border-[#f1f3f4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[#3c4043]">
              <Palette className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Firm Brand Color Theme:</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {FIRM_THEMES.map((theme) => {
                const isSelected = currentTheme.hex.toLowerCase() === theme.hex.toLowerCase();
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onUpdateFirmTheme && onUpdateFirmTheme(theme.hex)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                      isSelected 
                        ? 'border border-[#202124] shadow-xs font-bold bg-white text-[#202124] ring-2 ring-[#202124]/20' 
                        : 'border border-transparent bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
                    }`}
                    title={`Brand firm as ${theme.name}`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-xs" style={{ backgroundColor: theme.hex }} />
                    <span>{theme.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-[#137333]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[#f1f3f4]">
            <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl">
              <span className="text-xs text-[#5f6368] font-medium flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#1a73e8]" />
                Active Clients
              </span>
              <p className="text-xl font-bold text-[#202124] mt-1">{totalClients}</p>
            </div>

            <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl">
              <span className="text-xs text-[#5f6368] font-medium flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#1a73e8]" />
                Visits &amp; Applications
              </span>
              <p className="text-xl font-bold text-[#202124] mt-1">{totalVisits}</p>
            </div>

            <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl">
              <span className="text-xs text-[#5f6368] font-medium flex items-center gap-1.5">
                <PoundSterling className="w-4 h-4 text-[#137333]" />
                Total Solicitor Fees
              </span>
              <p className="text-xl font-bold text-[#137333] mt-1">£{totalAskingFees.toLocaleString()}</p>
              <span className="text-[10px] text-[#5f6368]">Doc Costs: £{totalDocSendingCosts.toLocaleString()}</span>
            </div>

            <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl">
              <span className="text-xs text-[#5f6368] font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#d93025]" />
                Missing Document Slots
              </span>
              <p className="text-xl font-bold text-[#d93025] mt-1">{totalMissingDocs} Pending</p>
              <span className="text-[10px] text-[#137333]">{totalApprovedDocs} Approved</span>
            </div>
          </div>
        </div>

        {/* Clients Directory & Controls */}
        <div className="space-y-4">
          {/* Search, Filter & Sort Toolbar */}
          <div className="bg-white border border-[#dadce0] rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            {/* Search Bar */}
            <div className="relative flex items-center bg-[#f1f3f4] hover:bg-[#e8eaed] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1a73e8] rounded-xl px-3 h-10 w-full sm:w-80 transition-all text-xs">
              <Search className="w-4 h-4 text-[#5f6368] mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search clients by name, phone, or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent outline-none text-[#202124]"
              />
            </div>

            {/* Filter pills & Sort */}
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
              {/* Priority filters */}
              <div className="flex items-center bg-[#f1f3f4] p-0.5 rounded-xl border border-[#dadce0] text-xs font-medium">
                <button
                  onClick={() => setPriorityFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    priorityFilter === 'all' ? 'bg-white text-[#1a73e8] font-bold shadow-xs' : 'text-[#5f6368] hover:text-[#202124]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setPriorityFilter('urgent')}
                  className={`px-2.5 py-1 rounded-lg transition-all font-bold ${
                    priorityFilter === 'urgent' ? 'bg-[#d93025] text-white shadow-xs' : 'text-[#d93025] hover:bg-[#fce8e6]'
                  }`}
                >
                  🔴 Urgent
                </button>
                <button
                  onClick={() => setPriorityFilter('high')}
                  className={`px-2.5 py-1 rounded-lg transition-all font-bold ${
                    priorityFilter === 'high' ? 'bg-[#b06000] text-white shadow-xs' : 'text-[#b06000] hover:bg-[#fef7e0]'
                  }`}
                >
                  🟠 High
                </button>
                <button
                  onClick={() => setPriorityFilter('normal')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    priorityFilter === 'normal' ? 'bg-[#1a73e8] text-white shadow-xs font-bold' : 'text-[#5f6368] hover:text-[#202124]'
                  }`}
                >
                  Normal
                </button>
                <button
                  onClick={() => setPriorityFilter('low')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    priorityFilter === 'low' ? 'bg-[#5f6368] text-white shadow-xs font-bold' : 'text-[#5f6368] hover:text-[#202124]'
                  }`}
                >
                  Low
                </button>
              </div>

              {/* Staff Filter */}
              {staffList.length > 0 && (
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="h-9 px-2.5 bg-[#f8fafd] border border-[#dadce0] text-xs font-medium text-[#202124] rounded-xl outline-none"
                >
                  <option value="all">All Staff Members</option>
                  <option value="unassigned">Unassigned Cases</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      Staff: {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              )}

              {/* Sort Selector */}
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as any)}
                className="h-9 px-2.5 bg-[#f8fafd] border border-[#dadce0] text-xs font-medium text-[#202124] rounded-xl outline-none"
              >
                <option value="date">Sort: Latest Visit Date</option>
                <option value="name">Sort: Client Name (A-Z)</option>
                <option value="priority">Sort: Priority Level</option>
                <option value="fee">Sort: Highest Fee</option>
              </select>
            </div>
          </div>

          {/* Client Cards List */}
          <div className="space-y-3">
            {filteredClients.length === 0 ? (
              <div className="p-12 text-center bg-white border border-[#dadce0] rounded-3xl shadow-xs">
                <Users className="w-12 h-12 text-[#bdc1c6] mx-auto mb-3" />
                <h4 className="font-bold text-sm text-[#202124]">No clients found</h4>
                <p className="text-xs text-[#5f6368] mt-1 max-w-sm mx-auto">
                  Try adjusting your search query or click "+ Register New Client" to add a record.
                </p>
              </div>
            ) : (
              filteredClients.map((client) => {
                // Find tabs and documents belonging to this client
                const clientTabs = tabs.filter((t) => t.clientId === client.id);
                const clientDocs = documents.filter((d) => 
                  d.clientId === client.id || clientTabs.some(t => t.id === d.collectionId)
                );
                const missingCount = clientDocs.filter(d => d.status === 'missing' || d.status === 'disapproved').length;
                const approvedCount = clientDocs.filter(d => d.status === 'approved').length;

                const priorityBorder = {
                  urgent: 'border-l-4 border-l-[#d93025]',
                  high: 'border-l-4 border-l-[#f59e0b]',
                  normal: 'border-l-4 border-l-[#1a73e8]',
                  low: 'border-l-4 border-l-[#dadce0]'
                }[client.priority] || '';

                const outstanding = (client.totalAskingAmount || 0) + (client.totalDocCost || 0) - (client.amountPaid || 0);

                return (
                  <div
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className={`group bg-white border border-[#dadce0] hover:border-[#1a73e8] hover:shadow-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 transition-all cursor-pointer relative overflow-hidden ${priorityBorder}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Client Name, Contact & Came For */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-2xl bg-[#1a73e8] text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
                          {client.name.replace(/^(Mr\.|Mrs\.|Ms\.|Dr\.)\s*/, '').charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-['Google_Sans',sans-serif] text-base sm:text-lg font-bold text-[#202124] group-hover:text-[#1a73e8] transition-colors">
                              {client.name}
                            </h3>
                            {getPriorityBadge(client.priority)}
                            <span className="text-[11px] font-bold text-[#1a73e8] bg-[#e8f0fe] px-2 py-0.5 rounded-full">
                              Came {client.visitCount} times
                            </span>
                          </div>

                          {/* Came For Reason */}
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#202124] font-medium flex-wrap">
                            <span className="text-[#5f6368]">Purpose:</span>
                            <span className="bg-[#f8fafd] border border-[#dadce0] px-2 py-0.5 rounded-md font-semibold text-[#1a73e8]">
                              {client.cameFor}
                            </span>
                          </div>

                          {/* Assigned Staff Member */}
                          <div className="mt-2 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[11px] font-bold text-[#5f6368] flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-[#1a73e8]" />
                              <span>Assigned:</span>
                            </span>
                            <select
                              value={client.assignedStaffId || ''}
                              onChange={(e) => {
                                if (onAssignStaffToClient) {
                                  onAssignStaffToClient(client.id, e.target.value || undefined);
                                }
                              }}
                              className="text-xs font-semibold px-2 py-0.5 rounded-lg border border-[#dadce0] bg-white text-[#202124] focus:outline-none focus:border-[#1a73e8]"
                            >
                              <option value="">Unassigned</option>
                              {staffList.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({s.role})
                                </option>
                              ))}
                            </select>
                            {client.assignedStaffId && (
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: staffList.find(s => s.id === client.assignedStaffId)?.avatarColor || '#1a73e8' }}
                              >
                                {staffList.find(s => s.id === client.assignedStaffId)?.role || 'Staff'}
                              </span>
                            )}
                          </div>

                          {/* Contact Details */}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-[#5f6368]">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-[#5f6368]" />
                              <span>{client.phone}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5 text-[#5f6368]" />
                              <span>{client.email}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#5f6368]" />
                              <span>Last Visit: {formatDate(client.lastVisitDate)}</span>
                            </span>
                          </div>

                          {/* Visit Applications Breakdown */}
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-[#5f6368]">Case Tabs:</span>
                            {clientTabs.map((t) => (
                              <span
                                key={t.id}
                                className="text-[10px] font-medium bg-[#f1f3f4] text-[#202124] px-2 py-0.5 rounded-md border border-[#dadce0]"
                              >
                                {t.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Fees Breakdown & Actions */}
                      <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-[#f1f3f4] flex-shrink-0">
                        {/* Financial Chips */}
                        <div className="text-left lg:text-right space-y-0.5">
                          <div className="flex items-center lg:justify-end gap-1.5 text-sm font-bold text-[#137333]">
                            <PoundSterling className="w-3.5 h-3.5" />
                            <span>Fee: £{client.totalAskingAmount?.toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-[#5f6368]">
                            Doc Cost: <strong className="text-[#202124]">£{client.totalDocCost?.toLocaleString()}</strong>
                          </div>
                          {/* Outstanding Balance */}
                          {outstanding > 0 ? (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#b06000] bg-[#fef7e0] px-2 py-0.5 rounded-full border border-[#fce8b2]">
                              <TrendingUp className="w-3 h-3" />
                              <span>Owes: £{outstanding.toLocaleString()}</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Fully Paid</span>
                            </div>
                          )}
                          {missingCount > 0 ? (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#d93025] bg-[#fce8e6] px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" />
                              <span>{missingCount} Missing Docs</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Docs In Order</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => onQuickShareClient(client, e)}
                            className="p-2 bg-[#f8fafd] hover:bg-[#e8f0fe] text-[#1a73e8] border border-[#dadce0] rounded-xl transition-colors shadow-xs"
                            title="Share Portal Link with Client"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {onEditClient && (
                            <button
                              onClick={(e) => onEditClient(client, e)}
                              className="p-2 bg-[#f8fafd] hover:bg-[#e8f0fe] text-[#1a73e8] border border-[#dadce0] rounded-xl transition-colors shadow-xs"
                              title="Edit Client Details, Visits & Payments"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClient(client);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Open</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => onDeleteClient(client.id, e)}
                            className="p-2 text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] rounded-xl transition-colors"
                            title="Delete Client Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Staff Directory & Team Management Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 select-none">
          <div className="bg-white rounded-3xl shadow-2xl border border-[#dadce0] w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#dadce0] flex items-center justify-between bg-gradient-to-r from-[#f8fafd] to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">
                    Firm Staff &amp; Team Directory
                  </h2>
                  <p className="text-xs text-[#5f6368]">
                    Manage solicitors, paralegals, and case workers assigned to client matters
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStaffModal(false)}
                className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Add Staff Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newStaffName.trim()) return;
                  const newMember: StaffMember = {
                    id: 'staff_' + Math.random().toString(36).substring(2, 9),
                    name: newStaffName.trim(),
                    role: newStaffRole,
                    email: newStaffEmail.trim() || `${newStaffName.toLowerCase().replace(/\s+/g, '.')}@lawfirm.co.uk`,
                    phone: newStaffPhone.trim() || '+44 20 7946 0000',
                    avatarColor: ['#1a73e8', '#137333', '#9334e6', '#d93025', '#e37400'][Math.floor(Math.random() * 5)],
                    createdAt: new Date().toISOString()
                  };
                  if (onAddStaffMember) onAddStaffMember(newMember);
                  setNewStaffName('');
                  setNewStaffEmail('');
                  setNewStaffPhone('');
                }}
                className="bg-[#f8fafd] border border-[#dadce0] rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#202124] uppercase tracking-wider">
                  <Plus className="w-4 h-4 text-[#1a73e8]" />
                  <span>Add New Staff Member</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      placeholder="e.g. Eleanor Vance"
                      className="w-full px-3 py-1.5 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Practice Role</label>
                    <select
                      value={newStaffRole}
                      onChange={(e) => setNewStaffRole(e.target.value as StaffRole)}
                      className="w-full px-3 py-1.5 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
                    >
                      <option value="Partner">Partner / Chambers Head</option>
                      <option value="Senior Solicitor">Senior Solicitor</option>
                      <option value="Solicitor">Solicitor</option>
                      <option value="Paralegal">Paralegal</option>
                      <option value="Case Worker">Case Worker</option>
                      <option value="Legal Secretary">Legal Secretary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Email Address</label>
                    <input
                      type="email"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      placeholder="e.vance@chambers.co.uk"
                      className="w-full px-3 py-1.5 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Direct Phone</label>
                    <input
                      type="text"
                      value={newStaffPhone}
                      onChange={(e) => setNewStaffPhone(e.target.value)}
                      placeholder="+44 20 7946 0988"
                      className="w-full px-3 py-1.5 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Firm</span>
                  </button>
                </div>
              </form>

              {/* Existing Staff Members List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#3c4043] uppercase tracking-wider block">
                  Current Staff ({staffList.length}):
                </span>
                {staffList.map((member) => {
                  const assignedCount = clients.filter(c => c.assignedStaffId === member.id).length;
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-2xl border border-[#dadce0] bg-white hover:border-[#1a73e8] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0"
                          style={{ backgroundColor: member.avatarColor || '#1a73e8' }}
                        >
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#202124] truncate">{member.name}</span>
                            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-[#f1f3f4] text-[#5f6368]">
                              {member.role}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-[#5f6368] mt-0.5 truncate">
                            <span>{member.email}</span>
                            {member.phone && <span>• {member.phone}</span>}
                            <span className="font-semibold text-[#1a73e8]">• {assignedCount} active case{assignedCount !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>

                      {onDeleteStaffMember && (
                        <button
                          type="button"
                          onClick={() => onDeleteStaffMember(member.id)}
                          className="p-1.5 text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] rounded-lg transition-colors ml-2 flex-shrink-0"
                          title="Remove Staff Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
