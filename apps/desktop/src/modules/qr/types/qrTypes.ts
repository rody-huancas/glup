// The same names as Rust (services/qr): what a QR keeps, how its WiFi is protected, its shapes, its file.
export type QrKind = 'text' | 'wifi' | 'whatsapp' | 'contact' | 'email';
export type WifiSecurity = 'wpa' | 'wep' | 'open';
export type QrShape = 'square' | 'rounded' | 'circle';
export type QrFormat = 'png' | 'svg' | 'pdf';
