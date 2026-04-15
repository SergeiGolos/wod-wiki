import React from 'react';

export interface QueryObject {
  text?: string;
  startDate?: Date;
  endDate?: Date;
  types?: ('note' | 'block' | 'result')[];
  category?: string;
}

export interface QueryOrganismProps {
  onQueryChange: (query: QueryObject) => void;
  initialQuery?: QueryObject;
}

export type QueryOrganism = React.FC<QueryOrganismProps>;

export interface FilteredListItem {
  id: string;
  type: 'note' | 'block' | 'result';
  title: string;
  subtitle?: string;
  date?: number;
  /** Source group for grouping in journal views ('playground', etc.) */
  group?: string;
  payload: any;
}
