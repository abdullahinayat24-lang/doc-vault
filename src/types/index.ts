export type FileType = 'pdf' | 'png' | 'jpg' | 'jpeg' | 'epub' | 'txt' | 'other';

export type DocumentStatus = 'missing' | 'disapproved' | 'pending' | 'approved';

export interface CollectionTab {
  id: string;
  name: string;
  clientName?: string;
  caseNumber?: string;
  icon?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  collectionId: string;
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
}

export type ShareScope = 'single' | 'multiple' | 'collection';

export interface ShareRecord {
  id: string;
  title: string;
  scope: ShareScope;
  targetIds: string[]; // document IDs or collection ID
  passcode: string; // 4-digit PIN required to view
  allowClientUpload?: boolean; // allows client to upload missing documents
  allowClientApprove?: boolean;
  createdAt: string;
  expiresAt?: string;
  ownerId: string;
  ownerEmail?: string;
  companyName?: string;
  companyLogo?: string;
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

export type SortField = 'date' | 'name' | 'status';
export type SortDirection = 'asc' | 'desc';
