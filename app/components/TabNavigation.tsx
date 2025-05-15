import { Tab } from '@headlessui/react';

interface TabNavigationProps {
  activeTab: 'toBuy' | 'purchased';
  onTabChange: (tab: 'toBuy' | 'purchased') => void;
}

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="w-full max-w-md px-2 sm:px-0 mb-6">
      <Tab.Group selectedIndex={activeTab === 'toBuy' ? 0 : 1} onChange={(index) => onTabChange(index === 0 ? 'toBuy' : 'purchased')}>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                selected
                  ? 'bg-white shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              }`
            }
          >
            To Buy
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                selected
                  ? 'bg-white shadow'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              }`
            }
          >
            Purchased
          </Tab>
        </Tab.List>
      </Tab.Group>
    </div>
  );
} 