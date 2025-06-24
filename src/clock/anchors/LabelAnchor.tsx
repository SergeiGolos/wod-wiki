import React from 'react';
import { CollectionSpan } from '../../CollectionSpan';

interface LabelAnchorProps {
  span?: CollectionSpan;
  template?: string;
  variant?: 'badge' | 'title' | 'subtitle' | 'next-up' | 'default';
  className?: string;
}

const resolveTemplate = (template: string, data: CollectionSpan) => {
  if (!template) return '';
  return template.replace(/\{\{(.*?)\}\}/g, (match, key) => {
    const value = (data as any)[key.trim()];
    return value !== undefined ? String(value) : match;
  });
};

export const LabelAnchor: React.FC<LabelAnchorProps> = ({ span, template, variant = 'default', className }) => {

  const text = span ? (template ? resolveTemplate(template, span) : (span as any).text || '') : '-';

  const variantClasses = {
    default: "text-gray-600 text-lg font-medium leading-normal",
    badge: "inline-block bg-emerald-100 text-emerald-700 text-sm font-semibold px-3 py-1 rounded-full mb-2",
    title: "text-gray-900 text-4xl font-bold leading-tight tracking-tight mb-2",
    subtitle: "text-gray-600 text-lg font-medium leading-normal",
    'next-up': "text-emerald-600 text-lg font-medium leading-normal mb-12",
  };

  const classes = `${variantClasses[variant]} ${className || ''}`;

  if (!span && variant !== 'title') {
      return <div className={classes}>-</div>;
  }
  
  if (!span && variant === 'title') {
    return <div className={variantClasses.title}>No Title</div>;
  }


  return (
    <p className={classes}>
      {text}
    </p>
  );
};
