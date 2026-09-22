import { DocumentItem, CollectionTab, SolicitorProfile, ClientRecord, DocumentFolder, StaffMember } from '../types';

// Valid base64 PDF
const samplePdfBase64 = 
  "JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFI+Pgpl" +
  "bmRvYmoKMiAwIG9iajw8L1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDE+PgplbmRvYmoK" +
  "MyAwIG9iajw8L1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQov" +
  "UmVzb3VyY2VzIDw8L0ZvbnQgPDwvRjEgNCAwIFI+Pj4+Ci9Db250ZW50cyA1IDAgUj4+CmVuZG9iag==" +
  "CjQgMCBvYmo8PC9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYT4+" +
  "CmVuZG9iago1IDAgb2JqCjw8L0xlbmd0aCAyNzU+PgpzdHJlYW0KQlQKL0YxIDI0IFRmCjcwIDcwMCBU" +
  "ZApbKERvY1ZhdWx0IC0gU29saWNpdG9yIENsaWVudCBQb3J0YWwpIF0gVGoKL0YxIDEyIFRmCjAgLTQw" +
  "IFRrCihPZmZpY2lhbCBDbGllbnQgQXBwbGljYXRpb24gRG9jdW1lbnQpIFRqCjAgLTI1IFRrCi0zMCBp" +
  "KCogQ2VydGlmaWVkIFNvbGljaXRvciBSZXZpZXcgQ29tcGxldGVkKSAgVGoKMCAtMjAgVGsKKCogQXBw" +
  "cm92ZWQgRG9jdW1lbnRzOiBHcmVlbiB8IE1pc3NpbmcvRGlzYXBwcm92ZWQ6IFJlZCkgVGoKMCAtMjAg" +
  "VGsKKCogU2hhcmUgd2l0aCA0LWRpZ2l0IFBJTiBwcm90ZWN0aW9uKSBUagpFVAplbmRzdHJlYW0KZW5k" +
  "b2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAw" +
  "MDY4IDAwMDAwIG4gCjAwMDAwMDAxMjUgMDAwMDAgbiAKMDAwMDAwMDI1OSAwMDAwMCBuIAowMDAwMDAw" +
  "MzM1IDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA2Ci9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCjY2Mwol" +
  "JUVPRgo=";

// Marriage certificate / official document SVG
const sampleCertificateSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="30" y="30" width="740" height="940" fill="none" stroke="#1a73e8" stroke-width="4" rx="12"/>
  <rect x="42" y="42" width="716" height="916" fill="none" stroke="#dadce0" stroke-width="1.5" rx="8"/>
  <circle cx="400" cy="110" r="40" fill="#e8f0fe"/>
  <text x="400" y="118" fill="#1a73e8" font-family="sans-serif" font-size="28" font-weight="bold" text-anchor="middle">§</text>
  <text x="400" y="180" fill="#202124" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">CERTIFICATE OF REGISTRATION</text>
  <text x="400" y="205" fill="#5f6368" font-family="sans-serif" font-size="13" text-anchor="middle">SOLICITOR VERIFIED LEGAL DOCUMENT • REG-2025-9981</text>
  <line x1="120" y1="230" x2="680" y2="230" stroke="#dadce0" stroke-width="1.5"/>
  <text x="120" y="270" fill="#1a73e8" font-family="sans-serif" font-size="14" font-weight="bold">Primary Applicant:</text>
  <text x="120" y="295" fill="#202124" font-family="sans-serif" font-size="16">Mr. Robert Vance</text>
  <text x="480" y="270" fill="#1a73e8" font-family="sans-serif" font-size="14" font-weight="bold">Secondary Applicant:</text>
  <text x="480" y="295" fill="#202124" font-family="sans-serif" font-size="16">Mrs. Sarah Vance</text>
  <rect x="100" y="340" width="600" height="180" fill="#f8fafd" stroke="#dadce0" stroke-width="1" rx="8"/>
  <text x="130" y="380" fill="#202124" font-family="sans-serif" font-size="14" font-weight="bold">Status of Legal Submission</text>
  <text x="130" y="415" fill="#5f6368" font-family="sans-serif" font-size="13">• Case File: VISA-UK-2025-APP</text>
  <text x="130" y="445" fill="#5f6368" font-family="sans-serif" font-size="13">• Registry Date: 14 January 2025</text>
  <text x="130" y="475" fill="#5f6368" font-family="sans-serif" font-size="13">• Certified By: Apex Law Chambers &amp; Solicitor Associates</text>
  <circle cx="200" cy="620" r="50" fill="#e6f4ea" stroke="#137333" stroke-width="2"/>
  <text x="200" y="626" fill="#137333" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">OFFICIAL</text>
  <text x="200" y="642" fill="#137333" font-family="sans-serif" font-size="11" text-anchor="middle">SEAL</text>
  <line x1="450" y1="640" x2="650" y2="640" stroke="#202124" stroke-width="1.5"/>
  <text x="550" y="660" fill="#5f6368" font-family="sans-serif" font-size="12" text-anchor="middle">Authorized Solicitor Signature</text>
</svg>
`)}`;

export const initialSolicitorProfile: SolicitorProfile = {
  id: 'solicitor_demo_preview',
  email: 'demo@docvault.law',
  displayName: 'David Sterling, Esq.',
  companyName: 'Apex Legal & Solicitor Chambers',
  companyLogo: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=160&auto=format&fit=crop&q=80',
  phone: '+44 20 7946 0912',
  address: '14 Chancery Lane, London, WC2A 1LB',
  sraNumber: 'SRA-682910',
  website: 'https://apexlawchambers.co.uk',
  pinCode: '1234',
  isDemoMode: true,
  role: 'admin',
  firmThemeColor: '#1a73e8'
};

export const demoSolicitorProfile = initialSolicitorProfile;

export const initialClients: ClientRecord[] = [
  {
    id: 'client-robert-vance',
    name: 'Mr. Robert Vance',
    phone: '+44 7911 123456',
    email: 'robert.vance@example.co.uk',
    cameFor: 'Spouse Settlement & Child Dependent Visa',
    priority: 'urgent',
    totalDocCost: 350,
    totalAskingAmount: 1850,
    amountPaid: 1200,
    firstVisitDate: '2024-01-10T10:00:00Z',
    lastVisitDate: '2025-09-18T16:00:00Z',
    visitCount: 4,
    assignedStaffId: 'demo-staff-sarah',
    notes: 'Came 4 times for spouse settlement consultation, biometric validation, and child visa dependent documentation.',
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2025-09-18T16:00:00Z'
  },
  {
    id: 'client-elena-rostova',
    name: 'Mrs. Elena Rostova',
    phone: '+44 7822 987654',
    email: 'elena.rostova@globaltech.co.uk',
    cameFor: 'Skilled Worker Visa (Tier 2)',
    priority: 'high',
    totalDocCost: 280,
    totalAskingAmount: 1500,
    amountPaid: 1500,
    firstVisitDate: '2024-06-12T09:30:00Z',
    lastVisitDate: '2025-08-20T14:00:00Z',
    visitCount: 3,
    assignedStaffId: 'demo-staff-mohammed',
    notes: 'Certificate of Sponsorship verified with Home Office. Police clearance and TB screening pending.',
    createdAt: '2024-06-12T09:30:00Z',
    updatedAt: '2025-08-20T14:00:00Z'
  },
  {
    id: 'client-tariq-mansoor',
    name: 'Dr. Tariq Al-Mansoor',
    phone: '+44 7733 445566',
    email: 'tariq.mansoor@harleymedical.co.uk',
    cameFor: 'Commercial Practice Lease & Partnership Tenancy',
    priority: 'normal',
    totalDocCost: 150,
    totalAskingAmount: 2200,
    amountPaid: 1000,
    firstVisitDate: '2025-03-01T11:00:00Z',
    lastVisitDate: '2025-07-15T15:30:00Z',
    visitCount: 2,
    assignedStaffId: 'demo-staff-emma',
    notes: 'Commercial lease agreement review for medical clinic premises in Central London.',
    createdAt: '2025-03-01T11:00:00Z',
    updatedAt: '2025-07-15T15:30:00Z'
  }
];

export const initialStaff: StaffMember[] = [
  {
    id: 'demo-staff-sarah',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@apexlaw.co.uk',
    username: 'sarah.jenkins@apexlaw.co.uk',
    password: 'staff',
    role: 'Paralegal',
    phone: '+44 7911 223344',
    avatarColor: '#1a73e8',
    assignedClientIds: ['client-robert-vance'],
    permissions: {
      canView: true,
      canUpload: true,
      canEdit: true,
      canDelete: false
    },
    inviteUsed: true,
    createdAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 'demo-staff-mohammed',
    name: 'Mohammed Farooq',
    email: 'mohammed.f@apexlaw.co.uk',
    username: 'mohammed.f@apexlaw.co.uk',
    password: 'staff',
    role: 'Solicitor',
    phone: '+44 7922 334455',
    avatarColor: '#137333',
    assignedClientIds: ['client-elena-rostova'],
    permissions: {
      canView: true,
      canUpload: true,
      canEdit: true,
      canDelete: false
    },
    inviteUsed: true,
    createdAt: '2024-03-01T10:00:00Z'
  },
  {
    id: 'demo-staff-emma',
    name: 'Emma Watson',
    email: 'emma.watson@apexlaw.co.uk',
    username: 'emma.watson@apexlaw.co.uk',
    password: 'staff',
    role: 'Legal Secretary',
    phone: '+44 7933 445566',
    avatarColor: '#9334ea',
    assignedClientIds: ['client-tariq-mansoor'],
    permissions: {
      canView: true,
      canUpload: true,
      canEdit: false,
      canDelete: false
    },
    inviteUsed: true,
    createdAt: '2024-02-10T11:00:00Z'
  }
];

export const initialTabs: CollectionTab[] = [
  // Linked to Robert Vance
  { 
    id: 'tab-app-2024', 
    clientId: 'client-robert-vance',
    name: 'Spouse Visa 2024', 
    caseNumber: 'RV-2024-01',
    icon: 'briefcase', 
    isDefault: true, 
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-11-20T14:30:00Z'
  },
  { 
    id: 'tab-app-2025', 
    clientId: 'client-robert-vance',
    name: 'Child Visa & Dependent Filing', 
    caseNumber: 'RV-CHD-02',
    icon: 'briefcase', 
    isDefault: true, 
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: '2025-09-18T16:00:00Z'
  },
  { 
    id: 'tab-robert-finance', 
    clientId: 'client-robert-vance',
    name: 'Financial & Bank Records', 
    caseNumber: 'RV-FIN-03',
    icon: 'folder', 
    createdAt: '2024-03-01T08:00:00Z',
    updatedAt: '2025-02-01T08:00:00Z'
  },

  // Linked to Elena Rostova
  { 
    id: 'tab-elena-worker', 
    clientId: 'client-elena-rostova',
    name: 'Skilled Worker 2024 Filing', 
    caseNumber: 'ER-2024-01',
    icon: 'briefcase', 
    isDefault: true,
    createdAt: '2024-06-15T10:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z'
  },
  { 
    id: 'tab-elena-police', 
    clientId: 'client-elena-rostova',
    name: 'Clearance & Health Records', 
    caseNumber: 'ER-CLR-02',
    icon: 'folder', 
    createdAt: '2024-08-01T10:00:00Z',
    updatedAt: '2025-03-01T10:00:00Z'
  },

  // Linked to Tariq Mansoor
  { 
    id: 'tab-tariq-lease', 
    clientId: 'client-tariq-mansoor',
    name: 'Commercial Lease 2025', 
    caseNumber: 'TM-LEASE-01',
    icon: 'briefcase', 
    isDefault: true,
    createdAt: '2025-03-05T10:00:00Z',
    updatedAt: '2025-07-15T10:00:00Z'
  },
  { 
    id: 'tab-tariq-partnership', 
    clientId: 'client-tariq-mansoor',
    name: 'Partnership Agreement', 
    caseNumber: 'TM-PTN-02',
    icon: 'folder', 
    createdAt: '2025-04-01T10:00:00Z',
    updatedAt: '2025-07-15T10:00:00Z'
  }
];

export const initialFolders: DocumentFolder[] = [
  // Robert Vance Folders
  {
    id: 'f-identity',
    collectionId: 'tab-app-2024',
    name: 'Identity & Passports',
    color: 'blue',
    createdAt: '2024-02-10T10:00:00Z'
  },
  {
    id: 'f-finance',
    collectionId: 'tab-app-2024',
    name: 'Financial & Income Proof',
    color: 'green',
    createdAt: '2024-02-10T10:00:00Z'
  },
  {
    id: 'f-relationship',
    collectionId: 'tab-app-2024',
    name: 'Relationship & Marriage Evidence',
    color: 'amber',
    createdAt: '2024-02-10T10:00:00Z'
  },
  {
    id: 'f-child',
    collectionId: 'tab-app-2025',
    name: 'Child Visa & Dependent Proof',
    color: 'purple',
    createdAt: '2025-01-15T09:00:00Z'
  },

  // Elena Rostova Folders
  {
    id: 'f-elena-cos',
    collectionId: 'tab-elena-worker',
    name: 'Home Office Sponsorship & Offer',
    color: 'blue',
    createdAt: '2024-06-15T10:00:00Z'
  },
  {
    id: 'f-elena-health',
    collectionId: 'tab-elena-police',
    name: 'TB Screening & Police Clearances',
    color: 'green',
    createdAt: '2024-08-01T10:00:00Z'
  },

  // Tariq Mansoor Folders
  {
    id: 'f-tariq-lease',
    collectionId: 'tab-tariq-lease',
    name: 'Commercial Lease & Head of Terms',
    color: 'blue',
    createdAt: '2025-03-05T10:00:00Z'
  },
  {
    id: 'f-tariq-deposit',
    collectionId: 'tab-tariq-lease',
    name: 'Rent Deposit & Guarantees',
    color: 'amber',
    createdAt: '2025-03-05T10:00:00Z'
  }
];

export const initialDocuments: DocumentItem[] = [
  // Robert Vance - Application in 2024
  {
    id: 'doc-pass-2024',
    clientId: 'client-robert-vance',
    collectionId: 'tab-app-2024',
    folderId: 'f-identity',
    name: 'Passport_Copy_Certified.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'approved', // GREEN
    createdAt: '2024-02-12T11:20:00Z',
    updatedAt: '2024-02-15T15:00:00Z',
    description: 'Certified biometric passport copy of primary applicant.'
  },
  {
    id: 'doc-cert-2024',
    clientId: 'client-robert-vance',
    collectionId: 'tab-app-2024',
    folderId: 'f-relationship',
    name: 'Marriage_Certificate_Translation.png',
    fileType: 'png',
    fileSize: 48200,
    url: sampleCertificateSvg,
    hasFile: true,
    status: 'pending', // WHITE / NORMAL
    createdAt: '2024-04-10T09:45:00Z',
    updatedAt: '2024-04-10T09:45:00Z',
    description: 'Apostilled registration certificate awaiting review.'
  },
  {
    id: 'doc-tax-disapproved',
    clientId: 'client-robert-vance',
    collectionId: 'tab-app-2024',
    folderId: 'f-finance',
    name: 'Proof_of_Income_Tax_Return_2024.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'disapproved', // RED
    notes: 'Solicitor note: Stamp and signature missing on page 2. Please re-upload certified version.',
    createdAt: '2024-05-01T14:10:00Z',
    updatedAt: '2024-05-02T10:30:00Z',
    description: 'Tax return copy needing rectification.'
  },
  {
    id: 'doc-police-missing',
    clientId: 'client-robert-vance',
    collectionId: 'tab-app-2024',
    folderId: 'f-identity',
    name: 'Police_Clearance_Certificate.pdf',
    fileType: 'pdf',
    fileSize: 0,
    url: '',
    hasFile: false,
    status: 'missing', // RED
    notes: 'Missing document: Client must obtain and upload certificate from local authority.',
    createdAt: '2024-06-01T16:00:00Z',
    updatedAt: '2024-06-01T16:00:00Z',
    description: 'Required document slot created by solicitor.'
  },

  // Robert Vance - Child Visa & Dependent Filing
  {
    id: 'doc-wife-pass-approved',
    clientId: 'client-robert-vance',
    collectionId: 'tab-app-2025',
    folderId: 'f-child',
    name: 'Wife_Passport_Biometrics.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'approved', // GREEN
    createdAt: '2025-01-16T12:00:00Z',
    updatedAt: '2025-01-18T10:00:00Z',
    description: 'Approved biometric document for secondary applicant.'
  },
  {
    id: 'doc-child-school',
    clientId: 'client-robert-vance',
    collectionId: 'tab-app-2025',
    folderId: 'f-child',
    name: 'Child_School_Enrollment_Letter.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'approved', // GREEN
    createdAt: '2025-01-22T09:00:00Z',
    updatedAt: '2025-01-25T11:00:00Z',
    description: 'UK Primary School letter confirming registered enrollment.'
  },
  {
    id: 'doc-child-birth',
    clientId: 'client-robert-vance',
    collectionId: 'tab-app-2025',
    folderId: 'f-child',
    name: 'Child_Birth_Certificate_Certified.png',
    fileType: 'png',
    fileSize: 48200,
    url: sampleCertificateSvg,
    hasFile: true,
    status: 'approved', // GREEN
    createdAt: '2025-01-24T14:00:00Z',
    updatedAt: '2025-01-25T10:00:00Z',
    description: 'Full official birth certificate with certified legal translation.'
  },
  {
    id: 'doc-wife-bank-missing',
    clientId: 'client-robert-vance',
    collectionId: 'tab-app-2025',
    folderId: 'f-child',
    name: 'Bank_Statement_Last_6_Months.pdf',
    fileType: 'pdf',
    fileSize: 0,
    url: '',
    hasFile: false,
    status: 'missing', // RED
    notes: 'Required: Official signed statements covering the past 6 months.',
    createdAt: '2025-02-01T08:00:00Z',
    updatedAt: '2025-02-01T08:00:00Z',
    description: 'Financial proof slot.'
  },

  // Elena Rostova - Skilled Worker (Client 2)
  {
    id: 'doc-elena-cos',
    clientId: 'client-elena-rostova',
    collectionId: 'tab-elena-worker',
    folderId: 'f-elena-cos',
    name: 'Certificate_of_Sponsorship_Verified.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'approved',
    createdAt: '2024-06-20T10:00:00Z',
    updatedAt: '2024-06-22T10:00:00Z',
    description: 'Verified Certificate of Sponsorship assigned by A-rated UK sponsor.'
  },
  {
    id: 'doc-elena-contract',
    clientId: 'client-elena-rostova',
    collectionId: 'tab-elena-worker',
    folderId: 'f-elena-cos',
    name: 'Employment_Contract_Permanent.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'approved',
    createdAt: '2024-06-25T11:00:00Z',
    updatedAt: '2024-06-25T11:00:00Z',
    description: 'Signed full-time employment agreement meeting minimum salary thresholds.'
  },
  {
    id: 'doc-elena-medical',
    clientId: 'client-elena-rostova',
    collectionId: 'tab-elena-police',
    folderId: 'f-elena-health',
    name: 'TB_Health_Screening_Report.pdf',
    fileType: 'pdf',
    fileSize: 0,
    url: '',
    hasFile: false,
    status: 'missing',
    notes: 'Official clinic stamp required from approved Home Office medical provider.',
    createdAt: '2024-08-10T10:00:00Z',
    updatedAt: '2024-08-10T10:00:00Z'
  },
  {
    id: 'doc-elena-police',
    clientId: 'client-elena-rostova',
    collectionId: 'tab-elena-police',
    folderId: 'f-elena-health',
    name: 'National_Police_Clearance_Original.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'pending',
    createdAt: '2024-08-15T15:00:00Z',
    updatedAt: '2024-08-15T15:00:00Z'
  },

  // Dr. Tariq Al-Mansoor - Commercial Lease (Client 3)
  {
    id: 'doc-tariq-lease',
    clientId: 'client-tariq-mansoor',
    collectionId: 'tab-tariq-lease',
    folderId: 'f-tariq-lease',
    name: 'Commercial_Lease_Agreement_Draft_v3.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'pending',
    createdAt: '2025-03-10T10:00:00Z',
    updatedAt: '2025-03-10T10:00:00Z',
    description: 'Draft commercial 10-year FRI lease agreement under review.'
  },
  {
    id: 'doc-tariq-plans',
    clientId: 'client-tariq-mansoor',
    collectionId: 'tab-tariq-lease',
    folderId: 'f-tariq-lease',
    name: 'Clinic_Floor_Plan_Architectural.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'approved',
    createdAt: '2025-03-12T14:00:00Z',
    updatedAt: '2025-03-12T14:00:00Z',
    description: 'Architectural floor plans detailing surgical room layout.'
  },
  {
    id: 'doc-tariq-deposit',
    clientId: 'client-tariq-mansoor',
    collectionId: 'tab-tariq-lease',
    folderId: 'f-tariq-deposit',
    name: 'Rent_Deposit_Deed_Signed.pdf',
    fileType: 'pdf',
    fileSize: 14280,
    url: `data:application/pdf;base64,${samplePdfBase64}`,
    hasFile: true,
    status: 'approved',
    createdAt: '2025-03-15T16:00:00Z',
    updatedAt: '2025-03-15T16:00:00Z',
    description: 'Executed Rent Deposit Deed with escrow account provisions.'
  }
];
