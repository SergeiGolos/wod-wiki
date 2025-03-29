import React from 'react';
import Editor from '@monaco-editor/react';

export interface MonacoEditorComponentProps {
  initialValue?: string;
  language?: string;
  theme?: string;
  height?: string | number;
}

const MonacoEditorComponent: React.FC<MonacoEditorComponentProps> = ({
  initialValue = '// Start typing your code...',
  language = 'typescript',
  theme = 'vs-dark', 
  height = '400px'
}) => {

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden" style={{ height: height, width: '100%' }}>
       <div className="p-3">test</div>
       <Editor
        height="100%" 
        language={language}
        theme={theme}
        value={initialValue}
        options={{
          automaticLayout: true, // Adjust layout on container resize
          minimap: { enabled: false } // Example: disable minimap
        }}
        // You can add onChange handlers etc. here
        // onChange={(value) => console.log(value)}
      />
    </div>
  );
};

export default MonacoEditorComponent;
