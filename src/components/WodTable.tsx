import React from 'react';

interface WodTableProps {
  data: any[];
}

const renderValue = (value: any): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toString();
  if (Array.isArray(value)) return value.join(', ');
  if (value === null || value === undefined) return '';
  return JSON.stringify(value);
};

export const WodTable: React.FC<WodTableProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500">Type your workout to see it parsed here...</p>
      </div>
    );
  }

  if (data.length === 1 && data[0].status === 'compiling') {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
        <p className="text-gray-500">Parsing workout...</p>
      </div>
    );
  }

  // Get all unique keys from the data
  const keys = Array.from(
    new Set(
      data.flatMap(item => 
        Object.keys(item).filter(key => 
          !['children', 'parent'].includes(key)
        )
      )
    )
  ).sort();

  const renderRow = (item: any, depth: number = 0) => {
    const rows = [];
    
    // Add the current row
    rows.push(
      <div 
        key={`${depth}-${JSON.stringify(item)}`} 
        className="flex hover:bg-gray-50"
      >
        {keys.map(key => (
          <div 
            key={key}
            className="flex-1 px-6 py-4 whitespace-nowrap text-sm text-gray-900"
            style={{ paddingLeft: `${depth * 2 + 1.5}rem` }}
          >
            {renderValue(item[key])}
          </div>
        ))}
      </div>
    );

    // Add child rows if they exist
    if (item.blocks && Array.isArray(item.blocks)) {
      item.blocks.forEach((child: any) => {
        rows.push(...renderRow(child, depth + 1));
      });
    }

    return rows;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header */}
          <div className="bg-gray-50">
            <div className="flex">
              {keys.map(key => (
                <div 
                  key={key}
                  className="flex-1 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {key}
                </div>
              ))}
            </div>
          </div>
          {/* Body */}
          <div className="bg-white divide-y divide-gray-200">
            {data.map(item => renderRow(item))}
          </div>
        </div>
      </div>
    </div>
  );
};
