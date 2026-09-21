import { DocumentItem, CollectionTab, SolicitorProfile } from '../types';

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
  id: 'solicitor_' + Math.random().toString(36).substring(2, 9),
  email: 'solicitor@apexlaw.com',
  displayName: 'David Sterling, Esq.',
  companyName: 'Apex Legal & Solicitor Chambers',
  companyLogo: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=160&auto=format&fit=crop&q=80',
  phone: '+44 20 7946 0912',
  address: '14 Chancery Lane, London, WC2A 1LB',
  pinCode: '1234',
  isDemoMode: true
};

export const initialTabs: CollectionTab[] = [
  { 
    id: 'tab-app-2024', 
    name: 'Application in 2024', 
    clientName: 'Robert Vance',
    caseNumber: 'RV-2024-09',
    icon: 'briefcase', 
    isDefault: true, 
    createdAt: '2024-02-10T10:00:00Z',
    updatedAt: '2024-11-20T14:30:00Z'
  },
  { 
    id: 'tab-app-2025', 
    name: 'Wife Application in 2025', 
    clientName: 'Sarah Vance',
    caseNumber: 'SV-2025-01',
    icon: 'briefcase', 
    isDefault: true, 
    createdAt: '2025-01-15T09:00:00Z',
    updatedAt: '2025-09-18T16:00:00Z'
  },
  { 
    id: 'tab-home', 
    name: 'Home Documents', 
    clientName: 'Personal',
    icon: 'home', 
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z'
  },
  { 
    id: 'tab-work', 
    name: 'Work Documents', 
    clientName: 'Corporate',
    icon: 'folder', 
    createdAt: '2024-03-01T08:00:00Z',
    updatedAt: '2026-03-01T08:00:00Z'
  }
];

export const initialDocuments: DocumentItem[] = [
  {
    id: 'doc-pass-2024',
    name: 'Passport_Copy_Certified.pdf',
    collectionId: 'tab-app-2024',
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
    name: 'Marriage_Certificate_Translation.png',
    collectionId: 'tab-app-2024',
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
    name: 'Proof_of_Income_Tax_Return_2024.pdf',
    collectionId: 'tab-app-2024',
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
    name: 'Police_Clearance_Certificate.pdf',
    collectionId: 'tab-app-2024',
    fileType: 'pdf',
    fileSize: 0,
    url: '',
    hasFile: false,
    status: 'missing', // RED (No document uploaded yet)
    notes: 'Missing document: Client must obtain and upload certificate from local authority.',
    createdAt: '2024-06-01T16:00:00Z',
    updatedAt: '2024-06-01T16:00:00Z',
    description: 'Required document slot created by solicitor.'
  },
  {
    id: 'doc-wife-pass-approved',
    name: 'Wife_Passport_Biometrics.pdf',
    collectionId: 'tab-app-2025',
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
    id: 'doc-wife-bank-missing',
    name: 'Bank_Statement_Last_6_Months.pdf',
    collectionId: 'tab-app-2025',
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
  {
    id: 'doc-epub-guide',
    name: 'Immigration_Handbook_2025.epub',
    collectionId: 'tab-app-2025',
    fileType: 'epub',
    fileSize: 32400,
    url: 'https://cdn.jsdelivr.net/gh/mushishi78/epub-samples@master/accessible_epub_3/EPUB/',
    hasFile: true,
    status: 'approved', // GREEN
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z',
    description: 'Reference handbook e-book for client guidance.'
  }
];
