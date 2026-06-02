import React from 'react';
import { FileText } from 'lucide-react';
import type { WodCollectionItem } from '@/repositories/wod-collections';
import type { IListItem } from '../types';

export function collectionItemToListItem(item: WodCollectionItem): IListItem<WodCollectionItem> {
  return {
    id: item.id,
    label: item.name,
    subtitle: item.path,
    icon: React.createElement(FileText, { className: 'w-4 h-4' }),
    keywords: [item.name, item.path],
    payload: item,
  };
}
