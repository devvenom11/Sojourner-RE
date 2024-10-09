'use client';

import { useEffect } from 'react';

const GoogleTagManager = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-T1MLBZ2HXJ';
    script.async = true;
    document.head.appendChild(script);

    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-T1MLBZ2HXJ');
    `;
    document.head.appendChild(inlineScript);
  }, []);

  return null;
};

export default GoogleTagManager;