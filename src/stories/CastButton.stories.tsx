import type { Meta, StoryObj } from '@storybook/react';
import '../index.css';
import React, { useState, useEffect } from 'react';
import { ChromecastDevice, ChromecastSession, ChromecastStatus } from '../cast/hooks/useChromecast';
import { SplitButton, SplitButtonOption } from '../components/buttons/SplitButton';
import { ButtonConfig } from '@/core/timer.types';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/solid';

// Mock values for useChromecast
const mockDevices: ChromecastDevice[] = [
  { id: 'device1', name: 'Living Room TV', friendlyName: 'Living Room TV' },
  { id: 'device2', name: 'Bedroom Chromecast', friendlyName: 'Bedroom' },
  { id: 'device3', name: 'Office Display', friendlyName: 'Office' },
];

// Create a mock CastButton component instead of trying to mock the hook
const MockCastButton: React.FC<{onStatusChange?: (isConnected: boolean) => void}> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<ChromecastStatus>('available');
  const [currentSession, setCurrentSession] = useState<ChromecastSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Handle connecting to a device
  const handleConnect = async (deviceId: string) => {
    try {
      const device = mockDevices.find(d => d.id === deviceId);
      if (!device) throw new Error('Device not found');
      
      setStatus('connecting');
      
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const newSession = {
        sessionId: `session-${deviceId}`,
        deviceId,
        deviceName: device.friendlyName || device.name,
        statusText: 'Connected'
      };
      
      setCurrentSession(newSession);
      setStatus('connected');
      setIsConnected(true);
      onStatusChange?.(true);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  // Handle disconnecting from current device
  const handleDisconnect = async () => {
    try {
      setStatus('disconnecting');
      
      // Simulate disconnection delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setCurrentSession(null);
      setStatus('available');
      setIsConnected(false);
      onStatusChange?.(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Create button options from available devices
  const getDeviceOptions = (): SplitButtonOption[] => {
    const options: SplitButtonOption[] = mockDevices.map(device => ({
      id: device.id,
      label: device.friendlyName || device.name,
      onClick: () => {
        handleConnect(device.id);
        return []; // No runtime events
      }
    }));

    // Add disconnect option if currently connected
    if (currentSession) {
      options.unshift({
        id: 'disconnect',
        label: `Disconnect from ${currentSession.deviceName}`,
        onClick: () => {
          handleDisconnect();
          return []; // No runtime events
        }
      });
    }

    return options;
  };

  // Main button config
  const mainAction: ButtonConfig = {
    label: currentSession ? `Casting to ${currentSession.deviceName}` : "Cast",
    icon: DevicePhoneMobileIcon,
    isActive: status === 'connected',
    onClick: () => {
      // If connected, disconnect. Otherwise, do nothing (user should select from dropdown)
      if (currentSession) {
        handleDisconnect();
      }
      return []; // No runtime events
    }
  };

  return (
    <SplitButton
      mainAction={mainAction}
      options={getDeviceOptions()}
      setEvents={() => {}} // Cast button doesn't generate timer events
      variant={status === 'connected' ? 'success' : 'default'}
    />
  );
};

// Create a wrapper component for demo purposes
const CastButtonDemo: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  
  const handleStatusChange = (connected: boolean) => {
    setIsConnected(connected);
    console.log('Connection status changed:', connected ? 'Connected' : 'Disconnected');
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Cast Button Demo</h2>
        <p className="text-sm text-gray-600 mb-4">
          Current status: <span className={isConnected ? "text-green-600 font-medium" : "text-gray-600"}>
            {isConnected ? "Connected" : "Not connected"}
          </span>
        </p>
        
        <div className="mt-2">
          <MockCastButton onStatusChange={handleStatusChange} />
        </div>
      </div>

      <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-md font-medium mb-2">Usage Notes</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          <li>The button appears only when ChromeCast is available in the browser</li>
          <li>Click the dropdown to see available devices</li>
          <li>Select a device to connect to it</li>
          <li>When connected, the button turns green</li>
          <li>Click the button or select "Disconnect" to end the session</li>
        </ul>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium mb-2">Note for Developers:</h4>
          <p className="text-xs text-gray-600">
            This is a mocked version using stub data. In a real application, the button
            will only appear when the ChromeCast API is available in the browser.
          </p>
        </div>
      </div>
    </div>
  );
};

const meta: Meta<typeof CastButtonDemo> = {
  title: 'Components/CastButton',
  component: CastButtonDemo,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
export type CastButtonStory = StoryObj<typeof CastButtonDemo>;

export const Default: CastButtonStory = {};
