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
      <tr key={`${depth}-${JSON.stringify(item)}`} className="hover:bg-gray-50">
        {keys.map(key => (
          <td 
            key={key}
            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
            style={{ paddingLeft: `${depth * 2 + 1.5}rem` }}
          >
            {renderValue(item[key])}
          </td>
        ))}
      </tr>
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {keys.map(key => (
                <th 
                  key={key}
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map(item => renderRow(item))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
