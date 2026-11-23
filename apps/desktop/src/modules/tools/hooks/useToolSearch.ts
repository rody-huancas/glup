import { useMemo, useState } from 'react';
import { TOOL_SECTIONS, TOOLS } from '@/modules/tools/constants/tools';
import { filterTools, groupTools } from '@/modules/tools/utils/search';

// Filters while typing; the sections that end up empty disappear.
export const useToolSearch = () => {
  const [query, setQuery] = useState('');
  const groups            = useMemo(() => groupTools({ tools: filterTools(TOOLS, query), sections: TOOL_SECTIONS }), [query]);

  return { query, setQuery, groups };
};
