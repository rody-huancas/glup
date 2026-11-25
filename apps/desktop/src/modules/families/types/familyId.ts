// The six families of tools, each with its color and its Glup.
export type FamilyId = 'images' | 'pdf' | 'media' | 'text' | 'clipboard' | 'pc';

// Each family has its own screen.
export type FamilyPageId = `family-${FamilyId}`;
