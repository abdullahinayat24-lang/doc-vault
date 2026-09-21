export type FileType = 'pdf' | 'png' | 'jpg' | 'jpeg' | 'epub' | 'txt' | 'other';

export type DocumentStatus = 'missing' | 'disapproved' | 'pending' | 'approved';

export type ShareType = 'viewer' | 'uploader'; // Document viewer vs Document uploader

export type ClientPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  cameFor: string; // Purpose: e.g. "Spouse Visa & Settlement", "Indefinite Leave to Remain"
  priority: ClientPriority;
  totalDocCost: number; // Total cost for sending docs / courier / registry fees
  totalAskingAmount: number; // Total solicitor agreed fee
  amountPaid: number; // Amount already paid
  firstVisitDate: string;
  lastVisitDate: string;
  visitCount: number; // e.g. came 4 times
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionTab {
  id: string;
  clientId: string; // Linked client ID
  name: string; // e.g. "Application in 2024", "Wife Application in 2025"
  clientName?: string;
  caseNumber?: string;
  icon?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentItem {
  id: string;
  clientId?: string;
  collectionId: string;
  name: string;
  fileType: FileType;
  fileSize: number; // in bytes
  url: string; // Object URL, base64 data URL, or remote Supabase storage URL
  hasFile: boolean; // false if it is a missing document placeholder
  status: DocumentStatus; // 'missing' | 'disapproved' -> Red, 'approved' -> Green, 'pending' -> White
  notes?: string;
  storagePath?: string;
  createdAt: string;
  updatedAt?: string;
  description?: string;
  uploadedBy?: 'solicitor' | 'client';
}

export type ShareScope = 'single' | 'multiple' | 'collection';

export interface ShareRecord {
  id: string;
  title: string;
  shareType: ShareType; // 'viewer' or 'uploader'
  scope: ShareScope;
  targetIds: string[]; // document IDs or collection ID
  passcode: string; // 4-digit PIN required to view
  allowClientUpload?: boolean;
  createdAt: string;
  expiresAt?: string;
  ownerId: string;
  ownerEmail?: string;
  companyName?: string;
  companyLogo?: string;
  clientId?: string;
}

export interface SolicitorProfile {
  id: string;
  email: string;
  displayName: string;
  companyName: string;
  companyLogo?: string;
  phone?: string;
  address?: string;
  pinCode: string; // 4-digit PIN for session lock
  isDemoMode: boolean;
  role?: 'admin' | 'staff';
}

export type UserProfile = SolicitorProfile;

export interface ViewerState {
  zoom: number; // 1 = 100%
  rotation: number; // 0, 90, 180, 270
  currentPage: number;
  totalPages: number;
  panOffset: { x: number; y: number };
  isPanning: boolean;
}

export type SortField = 'date' | 'name' | 'priority' | 'fee';
export type SortDirection = 'asc' | 'desc';

export interface InviteKeyRecord {
  id: string;
  key: string;
  createdAt: string;
  isUsed: boolean;
  usedByEmail?: string;
  usedAt?: string;
  label?: string;
}
