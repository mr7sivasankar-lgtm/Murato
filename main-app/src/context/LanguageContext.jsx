import { createContext, useContext, useState, useEffect } from 'react';
import T from '../data/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('murato_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('murato_lang', lang);
  }, [lang]);

  const t = (key) => T[lang]?.[key] ?? T['en']?.[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
