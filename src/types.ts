export const categoryLabels = {
  full_name: 'Full name', birthday: 'Birthday', address: 'Address',
  possible_name: 'Possible name', possible_location: 'Possible location',
  philsys_number: 'National ID number', tin: 'TIN', sss: 'SSS number',
  umid: 'UMID / CRN', philhealth: 'PhilHealth number', pagibig: 'Pag-IBIG MID',
  drivers_license: 'License number', passport: 'Passport number',
  mrz: 'Machine-readable passport data', signature: 'Signature area (estimated)',
  passport_security_area: 'Passport security area (estimated)', passport_portrait_area: 'Passport portrait area (estimated)',
  expiry_date: 'Expiry date', issue_date: 'Issue date', birthplace: 'Place of birth',
  phone: 'Phone number', card_number: 'Card number', account_number: 'Account number',
  reference: 'Reference number', email: 'Email address', digits: 'Long number',
  student_number: 'Student number', learner_number: 'Learner reference number', employee_number: 'Employee number', identity_number: 'ID number',
  card_security_code: 'Card security code', payment_secret: 'PIN / one-time password', education: 'Education details',
  sex: 'Sex', nationality: 'Nationality', agency_code: 'Agency / office code',
  medical_details: 'Medical details', employment_details: 'Employment details',
  government_number: 'Government / card identifier', pagibig_rtn: 'Pag-IBIG tracking number',
  face: 'Face', qr_code: 'QR code', barcode: 'Barcode', manual: 'Manual cover',
} as const;
export type Category = keyof typeof categoryLabels;
export interface Box { x: number; y: number; width: number; height: number }
export interface Word extends Box { text: string; line: number; confidence?: number }
export interface Detection extends Box { id: string; category: Category; enabled: boolean; estimated?: boolean }
export interface Watermark { recipient: string; purpose: string; date: string }
export type DocumentGuess = 'ID' | 'Receipt' | 'Chat screenshot' | 'Bank transfer' | 'Payment card' | 'Unknown';
export type CoverProfile = 'passport' | 'drivers-license';
export interface ScanResult {
  coverProfile?: CoverProfile;
  analysisStatus?: 'complete' | 'partial' | 'manual';
  width: number; height: number; detections: Detection[]; elapsedMs: number;
  warnings: string[]; documentGuess: DocumentGuess;
}
