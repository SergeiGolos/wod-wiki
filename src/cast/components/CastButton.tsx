import React from 'react';
import { useChromecast } from '../hooks/useChromecast';
import { SplitButton, SplitButtonOption } from '../../components/buttons/SplitButton';
import { ButtonConfig } from '@/core/timer.types';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/solid';

interface CastButtonProps {
  onStatusChange?: (isConnected: boolean) => void;
}

export const CastButton: React.FC<CastButtonProps> = ({ onStatusChange }) => {
  const {
    isAvailable,
    devices,
    currentSession,
    status,
    connect,
    disconnect,
    sendMessage
  } = useChromecast();

  // Handle connecting to a device
  const handleConnect = async (deviceId: string) => {
    try {
      await connect(deviceId);
      onStatusChange?.(true);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  // Handle disconnecting from current device
  const handleDisconnect = async () => {
    try {
      await disconnect();
      onStatusChange?.(false);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  // Create button options from available devices
  const getDeviceOptions = (): SplitButtonOption[] => {
    const options: SplitButtonOption[] = devices.map(device => ({
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

  // Don't render anything if Chromecast is unavailable
  if (!isAvailable) {
    return null;
  }

  return (
    <SplitButton
      mainAction={mainAction}
      options={getDeviceOptions()}
      setEvents={() => {}} // Cast button doesn't generate timer events
      variant={status === 'connected' ? 'success' : 'default'}
    />
  );
};
