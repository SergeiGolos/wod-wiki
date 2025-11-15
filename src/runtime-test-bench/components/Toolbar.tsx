import React from 'react';
import { ToolbarProps } from '../types/interfaces';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

/**
 * Toolbar component - provides navigation, actions, and branding
 * Top-level navigation bar for the runtime test bench
 */
export const Toolbar: React.FC<ToolbarProps> = ({
  title = 'WOD Wiki Runtime Test Bench',
  workoutName,
  navigationItems,
  onNavigate,
  actionButtons,
  onAction,
  userAvatar,
  userName,
  onUserClick,
  onSettingsClick,
  onHelpClick,
  className = '',
  testId = 'toolbar'
}) => {
  return (
    <div
      className={`bg-card border-b border-border px-4 py-3 ${className}`}
      data-testid={testId}
    >
      <div className="flex items-center justify-between">
        {/* Left side - Branding and Navigation */}
        <div className="flex items-center gap-6">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">
              {title}
            </h1>
            {workoutName && (
              <span className="text-muted-foreground">
                • {workoutName}
              </span>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navigationItems.map(item => (
              <button
                key={item.id}
                onClick={() => onNavigate?.(item.path)}
                className={`
                  px-3 py-2 rounded text-sm font-medium transition-colors
                  ${item.isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }
                `}
                data-testid={`nav-${item.id}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right side - Actions and User */}
        <div className="flex items-center gap-4">
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {actionButtons.map(button => {
              // If button has dropdown items, render as dropdown
              if (button.dropdown && button.dropdown.length > 0) {
                return (
                  <div key={button.id} className="flex items-center">
                    <button
                      onClick={() => onAction(button.id)}
                      disabled={button.disabled || button.loading}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-l text-sm font-medium transition-colors
                        ${button.disabled
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }
                      `}
                      title={button.tooltip}
                      data-testid={`action-${button.id}`}
                    >
                      <span>{button.icon}</span>
                      <span>{button.label}</span>
                      {button.loading && (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        disabled={button.disabled || button.loading}
                        className={`
                          px-2 py-2 rounded-r border-l border-white/20 text-sm font-medium transition-colors
                          ${button.disabled
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                          }
                        `}
                        data-testid={`action-${button.id}-dropdown`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {button.dropdown.map(item => (
                          <DropdownMenuItem
                            key={item.id}
                            onClick={() => onAction(item.id)}
                            disabled={item.disabled}
                            data-testid={`action-${item.id}`}
                          >
                            {item.icon && <span className="mr-2">{item.icon}</span>}
                            <span>{item.label}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              }

              // Regular button without dropdown
              return (
                <button
                  key={button.id}
                  onClick={() => onAction(button.id)}
                  disabled={button.disabled || button.loading}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors
                    ${button.disabled
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }
                  `}
                  title={button.tooltip}
                  data-testid={`action-${button.id}`}
                >
                  <span>{button.icon}</span>
                  <span>{button.label}</span>
                  {button.loading && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Settings and Help */}
          <div className="flex items-center gap-2">
            {onHelpClick && (
              <button
                onClick={onHelpClick}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                title="Help"
                data-testid="help-button"
              >
                ❓
              </button>
            )}
            {onSettingsClick && (
              <button
                onClick={onSettingsClick}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                title="Settings"
                data-testid="settings-button"
              >
                ⚙️
              </button>
            )}
          </div>

          {/* User */}
          {(userName || userAvatar) && (
            <button
              onClick={onUserClick}
              className="flex items-center gap-2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
              data-testid="user-button"
            >
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={userName || 'User'}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {(userName || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              {userName && (
                <span className="text-sm">{userName}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};