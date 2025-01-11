import React from 'react';
import { useEffect, useRef } from 'react';

export const BuyMeACoffee: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadScript = () => {
      if (!containerRef.current) return;
      
      // Create button container
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'bmc-btn-container';
      containerRef.current.appendChild(buttonContainer);

      // Create link
      const link = document.createElement('a');
      link.className = 'bmc-btn';
      link.target = '_blank';
      link.href = 'https://www.buymeacoffee.com/sergeigolos';
      link.innerHTML = '☕ Buy me a coffee';
      link.style.backgroundColor = '#FFDD00';
      link.style.padding = '8px 16px';
      link.style.borderRadius = '5px';
      link.style.color = '#000000';
      link.style.textDecoration = 'none';
      link.style.display = 'inline-flex';
      link.style.alignItems = 'center';
      link.style.justifyContent = 'center';
      link.style.fontFamily = 'Poppins, sans-serif';
      link.style.fontSize = '14px';
      link.style.fontWeight = '600';
      
      buttonContainer.appendChild(link);
    };

    loadScript();

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return <div ref={containerRef} style={{ display: 'inline-block' }} />;
};
