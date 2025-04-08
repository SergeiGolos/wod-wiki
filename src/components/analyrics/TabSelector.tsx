import React from 'react';

export type TabOption = 'Totals' | 'Efforts' | 'Analytics';

interface TabSelectorProps {
  activeTab: TabOption;
  onTabChange: (tab: TabOption) => void;
}

export const TabSelector: React.FC<TabSelectorProps> = ({ activeTab, onTabChange }) => {
  const tabs: TabOption[] = ['Efforts', 'Totals', 'Analytics'];

  return (
    <div className="tab-navigation mb-3">
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 font-medium ${
              activeTab === tab 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => onTabChange(tab)}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};
