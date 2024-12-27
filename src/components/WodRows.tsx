import React from 'react';

// Row type components
const HeaderRow: React.FC<{ 
  title: string;
  level: number;
}> = ({ title, level }) => {
  const styles = {
    1: "text-2xl font-bold text-gray-900 mb-4",
    2: "text-xl font-semibold text-gray-800 mb-3",
    3: "text-lg font-medium text-gray-700 mb-2"
  }[level];

  return (
    <div className={`px-6 py-3 ${level === 1 ? 'border-b border-gray-200' : ''}`}>
      <h1 className={styles}>{title}</h1>
    </div>
  );
};

const ParagraphRow: React.FC<{ 
  text: string;
  depth?: number;
}> = ({ text, depth = 0 }) => (
  <div 
    className="px-6 py-2 text-gray-600"
    style={{ marginLeft: `${depth * 1.5}rem` }}
  >
    <p className="text-base leading-relaxed">{text}</p>
  </div>
);

const BlockRow: React.FC<{
  duration?: string;
  reps?: number;
  effort?: string;
  depth?: number;
}> = ({ duration, reps, effort, depth = 0 }) => {
  return (
    <div 
      className="px-6 py-3 bg-gray-50 rounded-lg border border-gray-200"
      style={{ marginLeft: `${depth * 1.5}rem` }}
    >
      <div className="flex items-center gap-2">
        {duration && (
          <span className="font-mono text-gray-500 min-w-[4rem]">
            {duration}
          </span>
        )}
        {reps && (
          <span className="font-medium text-gray-700">
            {reps}×
          </span>
        )}
        {effort && (
          <span className="text-gray-600">
            {effort}
          </span>
        )}
      </div>
    </div>
  );
};

const NotificationRow: React.FC<{
  status: string;
}> = ({ status }) => {
  if (status === 'compiling') {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200 animate-pulse">
        <p className="text-gray-500">Parsing workout...</p>
      </div>
    );
  }
  return null;
};

const EmptyRow: React.FC = () => (
  <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
    <p className="text-gray-500">Type your workout to see it parsed here...</p>
  </div>
);

// Main row renderer
const RowRenderer: React.FC<{
  data: any;
  depth: number;
}> = ({ data, depth }) => {
  console.log('Rendering row:', data);

  switch (data.type) {
    case 'header':
      return <HeaderRow title={data.text} level={data.level?.length || 1} />;
    
    case 'paragraph':
      return <ParagraphRow text={data.text} depth={depth} />;
    
    case 'block':
      return (
        <BlockRow 
          duration={data.duration}
          reps={data.reps}
          description={data.description}
          children={data.children}
          depth={depth}
        />
      );

    case 'notification':
      return <NotificationRow status={data.status} />;
    
    default:
      console.warn('Unknown row type:', data.type);
      return null;
  }
};

interface WodRowsProps {
  data: any[];
}

export const WodRows: React.FC<WodRowsProps> = ({ data }) => {
  console.log('WodRows received data:', data);

  if (!data || data.length === 0) {
    return <EmptyRow />;
  }

  return (
    <div className="flex flex-col gap-2 bg-white rounded-lg border border-gray-200 overflow-hidden p-4 min-h-[200px]">
      {data.map((item, index) => (
        <RowRenderer key={index} data={item} depth={0} />
      ))}
    </div>
  );
};
