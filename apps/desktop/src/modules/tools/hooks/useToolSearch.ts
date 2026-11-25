import { useMemo, useState } from 'react';
import { FAMILY_IDS } from '@/modules/families/constants/families';
import { TOOLS } from '@/modules/tools/constants/tools';
import { filterTools, groupTools } from '@/modules/tools/utils/search';

// Filters while typing; the families that end up empty disappear.
export const useToolSearch = () => {
  const [query, setQuery] = useState('');
  const groups            = useMemo(() => groupTools({ tools: filterTools(TOOLS, query), families: FAMILY_IDS }), [query]);

  return { query, setQuery, groups };
};
