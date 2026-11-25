import sizesJson from '@/modules/social/constants/sizes.json';
import type { SocialNetwork } from '@/modules/social/interfaces/socialSize';

// The sizes of the networks live in sizes.json (Rust's tests read it too).
export const NETWORKS = sizesJson as SocialNetwork[];
export const CUSTOM_ID = 'custom';
