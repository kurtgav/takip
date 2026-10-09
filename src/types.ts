export const categoryLabels = {
  full_name: 'Full name', birthday: 'Birthday', address: 'Address',
  philsys_number: 'National ID number', tin: 'TIN', sss: 'SSS number',
  umid: 'UMID / CRN', philhealth: 'PhilHealth number', pagibig: 'Pag-IBIG MID',
  drivers_license: "Driver’s license", passport: 'Passport number',
  phone: 'Phone number', card_number: 'Card number', account_number: 'Account number',
  reference: 'Reference number', email: 'Email address', digits: 'Long number',
  face: 'Face', qr_code: 'QR code', barcode: 'Barcode', manual: 'Manual cover',
} as const;
export type Category = keyof typeof categoryLabels;
export interface Box { x: number; y: number; width: number; height: number }
export interface Word extends Box { text: string; line: number }
export interface Detection extends Box { id: string; category: Category; enabled: boolean }
export interface Watermark { recipient: string; purpose: string; date: string }
export interface ScanResult {
  width: number; height: number; detections: Detection[]; elapsedMs: number;
  warnings: string[];
}
