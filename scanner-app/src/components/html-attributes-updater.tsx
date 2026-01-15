'use client';

import { useEffect } from 'react';

interface HtmlAttributesUpdaterProps {
  lang: string;
  dir: string;
}

export function HtmlAttributesUpdater({ lang, dir }: HtmlAttributesUpdaterProps) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return null;
}
