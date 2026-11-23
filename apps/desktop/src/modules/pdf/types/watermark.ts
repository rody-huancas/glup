export type WatermarkSize = 'small' | 'medium' | 'large';

export type WatermarkOpacity = 'soft' | 'medium' | 'strong';

// diagonal: across the page, from the bottom-left corner · corner: small, at the bottom-right.
export type WatermarkPosition = 'diagonal' | 'corner';

// The quick texts, or one typed by the person.
export type WatermarkPreset = 'copy' | 'draft' | 'confidential' | 'custom';
