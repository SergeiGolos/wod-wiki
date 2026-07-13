import React from 'react';

/**
 * MobileFrame — wraps a child page in a centered, constrained viewport so a
 * desktop Storybook canvas behaves like a mobile device. Used by the
 * `testing/mobile` group to exercise the page surface on a phone-sized stage.
 *
 * Dimensions chosen to match a common phone (iPhone 14/15): 390×844. The frame
 * sits on a neutral background, centered, with a subtle border + shadow to read
 * as a device in the Storybook canvas.
 */
export interface MobileFrameProps {
  children: React.ReactNode;
  /** Override the frame width (px). Default 390. */
  width?: number;
  /** Override the frame height (px). Default 844. */
  height?: number;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({
  children,
  width = 390,
  height = 844,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '24px',
        minHeight: '100vh',
        background: '#f4f4f5',
      }}
    >
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxHeight: 'calc(100vh - 48px)',
          border: '1px solid #d4d4d8',
          borderRadius: '24px',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow:
            '0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
};
