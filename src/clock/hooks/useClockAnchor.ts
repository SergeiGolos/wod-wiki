import { useContext, useEffect, useState } from 'react';
import { CollectionSpan } from '../../CollectionSpan';

export const useClockAnchor = (id: string) => {
    const
  const [data, setData] = useState<CollectionSpan | undefined>(() => context.currentState.get(id));

  useEffect(() => {
    const unsubscribe = context.subscribe(id, setData);
    return () => unsubscribe();
  }, [id, context]);

  return data;
};
