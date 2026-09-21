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
  Check
} from 'lucide-react';
import { ClientRecord, SolicitorProfile, CollectionTab, DocumentItem, ClientPriority } from '../types';

interface CompanyDashboardProps {
  solicitor: SolicitorProfile;
  clients: ClientRecord[];
  tabs: CollectionTab[];
  documents: DocumentItem[];
  onSelectClient: (client: ClientRecord) => void;
  onOpenNewClientModal: () => void;
  onDeleteClient: (clientId: string, e: React.MouseEvent) => void;
  onQuickShareClient: (client: ClientRecord, e: React.MouseEvent) => void;
  onEditCompanyProfile: () => void;
}

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  solicitor,
  clients,
  tabs,
  documents,
  onSelectClient,
  onOpenNewClientModal,
  onDeleteClient,
  onQuickShareClient,
  onEditCompanyProfile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'date' | 'name' | 'priority' | 'fee'>('date');
  const [priorityFilter, setPriorityFilter] = useState<'all' | ClientPriority>('all');

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
  }, [clients, searchQuery, sortOption, priorityFilter]);

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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1557b0] text-white flex items-center justify-center font-bold text-2xl shadow-sm ring-4 ring-blue-50 flex-shrink-0">
                  <Building className="w-8 h-8" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-['Google_Sans',sans-serif] text-xl sm:text-2xl font-bold text-[#202124]">
                    {solicitor.companyName}
                  </h1>
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded bg-[#e8f0fe] text-[#1a73e8]">
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

            {/* Edit Profile button */}
            <div className="flex items-center gap-2">
              <button
                onClick={onEditCompanyProfile}
                className="px-4 py-2 border border-[#dadce0] hover:bg-[#f1f3f4] text-[#202124] text-xs font-semibold rounded-xl transition-colors shadow-xs"
              >
                Edit Firm Details
              </button>
              <button
                onClick={onOpenNewClientModal}
                className="flex items-center gap-2 px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-all"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Register New Client</span>
              </button>
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
                    priorityFilter === 'all' ? 'bg-white text-[#1a73e8] font-bold shadow-xs' : 'text-[#5f6368]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setPriorityFilter('urgent')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    priorityFilter === 'urgent' ? 'bg-[#d93025] text-white font-bold' : 'text-[#d93025]'
                  }`}
                >
                  Urgent
                </button>
                <button
                  onClick={() => setPriorityFilter('high')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    priorityFilter === 'high' ? 'bg-[#b06000] text-white font-bold' : 'text-[#b06000]'
                  }`}
                >
                  High
                </button>
              </div>

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

                return (
                  <div
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className="group bg-white border border-[#dadce0] hover:border-[#1a73e8] hover:shadow-md rounded-2xl sm:rounded-3xl p-5 sm:p-6 transition-all cursor-pointer relative"
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
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-[#202124] font-medium">
                            <span className="text-[#5f6368]">Purpose:</span>
                            <span className="bg-[#f8fafd] border border-[#dadce0] px-2 py-0.5 rounded-md font-semibold text-[#1a73e8]">
                              {client.cameFor}
                            </span>
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
                        <div className="text-left lg:text-right">
                          <div className="flex items-center lg:justify-end gap-1.5 text-sm font-bold text-[#137333]">
                            <span>Solicitor Fee: £{client.totalAskingAmount?.toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-[#5f6368]">
                            Doc Sending Cost: <strong className="text-[#202124]">£{client.totalDocCost?.toLocaleString()}</strong>
                          </div>
                          {missingCount > 0 ? (
                            <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-[#d93025] bg-[#fce8e6] px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" />
                              <span>{missingCount} Missing / Disapproved Docs</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>All Documents In Order</span>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => onQuickShareClient(client, e)}
                            className="p-2 bg-[#f8fafd] hover:bg-[#e8f0fe] text-[#1a73e8] border border-[#dadce0] rounded-xl transition-colors shadow-xs"
                            title="Share Uploader or Viewer Link with Client (4-Digit PIN)"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectClient(client);
                            }}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Open Documents</span>
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
    </div>
  );
};
