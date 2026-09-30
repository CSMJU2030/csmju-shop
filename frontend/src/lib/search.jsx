'use client';

import { createContext, useContext, useState } from 'react';

/** คำค้นจากช่องค้นหาบนหัวเว็บ ใช้ร่วมกันระหว่าง header กับหน้าแคตตาล็อก */
const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [query, setQuery] = useState('');
  return <SearchContext.Provider value={{ query, setQuery }}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  return useContext(SearchContext) ?? { query: '', setQuery: () => {} };
}
