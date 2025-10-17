# Spec Delta: TestBench Cross-Panel Coordination

## MODIFIED Requirements

### Requirement: Cross-Panel Highlighting Coordination
The RuntimeTestBench SHALL coordinate highlighting across panels using React Context API instead of prop drilling, enabling panels to self-subscribe to highlighting state.

**Changes:**
- Replace 16+ highlighting props with Context API
- Implement separate HighlightingContext for frequently-changing state
- Eliminate bidirectional data flow (panels no longer mutate parent state directly)
- Support multi-element highlighting (future enhancement readiness)

#### Scenario: Highlight Block in Stack Panel
- **GIVEN** user hovers over a block in RuntimeStackPanel
- **WHEN** block hover event triggers
- **THEN** panel calls `setHighlight({ type: 'block', id: 'block-key-123' })`
- **AND** HighlightingContext updates with new highlighted block
- **AND** all consumers of HighlightingContext re-render with updated state
- **AND** no props are passed through RuntimeTestBench parent

#### Scenario: Highlight Memory Entry in Memory Panel
- **GIVEN** user hovers over a memory entry in MemoryPanel
- **WHEN** memory entry hover event triggers
- **THEN** panel calls `setHighlight({ type: 'memory', id: 'memory-entry-456' })`
- **AND** HighlightingContext updates
- **AND** related panels reflect highlighting (e.g., EditorPanel shows related line)

#### Scenario: Clear Highlighting on Mouse Leave
- **GIVEN** an element is currently highlighted
- **WHEN** user moves mouse outside panel area
- **THEN** panel calls `clearHighlight()`
- **AND** all highlighting state is cleared
- **AND** no elements show highlight styling

### Requirement: UI Preferences Management
The RuntimeTestBench SHALL manage UI preferences (showMetrics, showIcons, expandAll, theme) through PreferencesContext instead of prop drilling.

#### Scenario: Toggle Metrics Display
- **GIVEN** user wants to show/hide metrics in stack panel
- **WHEN** user clicks "Toggle Metrics" button
- **THEN** `preferences.toggleMetrics()` is called via PreferencesContext
- **AND** all panels consuming `showMetrics` re-render with updated preference
- **AND** preference persists across panel navigation

#### Scenario: Change Theme Preference
- **GIVEN** user wants to switch between light and dark themes
- **WHEN** user selects dark theme from preferences
- **THEN** `preferences.setTheme('dark')` updates PreferencesContext
- **AND** all panels receive updated theme via context
- **AND** panels apply dark theme styling

## REMOVED Requirements

### Requirement: Prop-Based Highlighting Coordination
**Removed**: The RuntimeTestBench SHALL pass highlighting state and setter functions to panels via props for cross-panel coordination.

**Reason**: Prop drilling creates tight coupling, doesn't scale as features are added, and creates bidirectional data flow that violates React principles.

**Migration**: Replace prop drilling with Context API:
```typescript
// Before - prop drilling
<RuntimeStackPanel
  highlightedBlockKey={highlightState.blockKey}
  onBlockHover={(blockKey) => setBlockHighlight(blockKey, 'stack')}
/>

<MemoryPanel
  highlightedMemoryId={highlightState.memoryId}
  onEntryHover={(memoryId) => setMemoryHighlight(memoryId, 'memory')}
/>

// After - Context API
<RuntimeStackPanel blocks={blocks} />
<MemoryPanel entries={memory} />

// Inside RuntimeStackPanel:
const { highlightedBlock, setHighlight } = useContext(HighlightingContext);
```

### Requirement: Component-Managed UI Preferences
**Removed**: The RuntimeTestBench SHALL maintain UI preferences in component state and pass to panels via props.

**Reason**: Preferences are cross-cutting concerns that should be accessible to any panel without parent component involvement.

**Migration**: Use PreferencesContext:
```typescript
// Before
const [showMetrics, setShowMetrics] = useState(true);
const [showIcons, setShowIcons] = useState(true);

<RuntimeStackPanel
  showMetrics={showMetrics}
  showIcons={showIcons}
/>

// After
<RuntimeStackPanel blocks={blocks} />

// Inside RuntimeStackPanel:
const { showMetrics, showIcons } = useContext(PreferencesContext);
```

## ADDED Requirements

### Requirement: Context-Based State Sharing
The RuntimeTestBench SHALL provide HighlightingContext and PreferencesContext for cross-panel state coordination without prop drilling.

#### Scenario: Access Highlighting State from Any Panel
- **GIVEN** any panel component rendered inside TestBenchProvider
- **WHEN** panel needs highlighting state
- **THEN** panel can call `const { highlightedBlock, setHighlight } = useContext(HighlightingContext)`
- **AND** panel receives current highlighting state
- **AND** panel can update highlighting via setHighlight function
- **AND** no props need to be passed through parent component

#### Scenario: Access Preferences from Any Panel
- **GIVEN** any panel component rendered inside TestBenchProvider
- **WHEN** panel needs UI preferences
- **THEN** panel can call `const { showMetrics, toggleMetrics } = useContext(PreferencesContext)`
- **AND** panel receives current preferences
- **AND** panel can update preferences via context functions

### Requirement: Context Separation for Performance
The RuntimeTestBench SHALL use separate Context providers for highlighting (high-frequency updates) and preferences (low-frequency updates) to minimize unnecessary re-renders.

#### Scenario: Update Highlighting Without Re-rendering Preference Consumers
- **GIVEN** panels consuming HighlightingContext and PreferencesContext
- **WHEN** highlighting state changes (user hovers over element)
- **THEN** only panels consuming HighlightingContext re-render
- **AND** panels only consuming PreferencesContext do NOT re-render
- **AND** total re-renders are minimized

#### Scenario: Update Preferences Without Re-rendering Highlighting Consumers
- **GIVEN** panels consuming both contexts
- **WHEN** preferences change (user toggles showMetrics)
- **THEN** only panels consuming PreferencesContext re-render
- **AND** highlighting-only consumers do NOT re-render

### Requirement: Provider Wrapper Pattern
The RuntimeTestBench SHALL wrap panel components in TestBenchProvider to provide contexts to all children.

#### Scenario: Render RuntimeTestBench with Context Providers
- **GIVEN** RuntimeTestBench component renders
- **WHEN** component mounts
- **THEN** TestBenchProvider wraps all panel children
- **AND** HighlightingContext.Provider is rendered with highlighting state
- **AND** PreferencesContext.Provider is rendered with preferences state
- **AND** all panels can access both contexts via useContext hooks

### Requirement: Simplified Panel Props
The RuntimeTestBench SHALL pass only data props to panels, eliminating callback and state coordination props.

#### Scenario: RuntimeStackPanel Receives Minimal Props
- **GIVEN** RuntimeStackPanel component
- **WHEN** rendered by RuntimeTestBench
- **THEN** panel receives only `blocks: RuntimeStackBlock[]` prop
- **AND** panel accesses highlighting via HighlightingContext
- **AND** panel accesses preferences via PreferencesContext
- **AND** total props reduced from 15+ to <5

#### Scenario: MemoryPanel Receives Minimal Props
- **GIVEN** MemoryPanel component
- **WHEN** rendered by RuntimeTestBench
- **THEN** panel receives only `entries: MemoryEntry[]` prop
- **AND** panel manages filtering state internally or via context
- **AND** panel accesses highlighting and preferences via context
- **AND** total props reduced from 12+ to <5

## Performance Impact

**Current Performance (Baseline):**
- Props passed to panels: 16+ highlighting/preference props
- Re-renders when highlighting changes: All panels (even those not using highlighting)
- Re-renders when preferences change: All panels (even those not using preferences)

**Target Performance (Post-Change):**
- Props passed to panels: <5 data props only
- Re-renders when highlighting changes: Only HighlightingContext consumers
- Re-renders when preferences change: Only PreferencesContext consumers
- Expected re-render reduction: ~50% (via context selective subscription)

## Backward Compatibility

**Breaking Changes:**
- Panel prop interfaces significantly changed (16+ props removed)
- Panels must be wrapped in TestBenchProvider to function
- Panels must use useContext hooks instead of receiving props
- Callback prop names changed (e.g., `onBlockHover` → context-based `setHighlight`)

**Migration Path:**
1. Wrap RuntimeTestBench children in TestBenchProvider
2. Update panel components to use useContext hooks
3. Remove highlighting and preference props from panel interfaces
4. Update Storybook stories to render panels inside provider
5. Update tests to provide context in test renders

Example migration:
```typescript
// Before - Panel Implementation
export const RuntimeStackPanel: React.FC<RuntimeStackPanelProps> = ({
  blocks,
  highlightedBlockKey,
  onBlockHover,
  showMetrics,
  showIcons,
  ...15 more props
}) => {
  // Use props directly
};

// After - Panel Implementation
export const RuntimeStackPanel: React.FC<{blocks: RuntimeStackBlock[]}> = ({ blocks }) => {
  const { highlightedBlock, setHighlight } = useContext(HighlightingContext);
  const { showMetrics, showIcons } = useContext(PreferencesContext);
  
  // Use context values
};
```

**No Impact:**
- External consumers (none - internal tool)
- Visual behavior (identical highlighting and preferences)
- Panel functionality (same features, different access pattern)

## Testing Considerations

### Context Testing Pattern
```typescript
// Test helper
const renderWithContexts = (component: ReactNode) => {
  return render(
    <HighlightingContext.Provider value={mockHighlighting}>
      <PreferencesContext.Provider value={mockPreferences}>
        {component}
      </PreferencesContext.Provider>
    </HighlightingContext.Provider>
  );
};

// Test
it('should highlight block on hover', () => {
  const { getByText } = renderWithContexts(<RuntimeStackPanel blocks={mockBlocks} />);
  fireEvent.mouseEnter(getByText('Block 1'));
  expect(mockHighlighting.setHighlight).toHaveBeenCalledWith({ type: 'block', id: 'block-1' });
});
```

### Performance Testing
```typescript
it('should not re-render preference consumers when highlighting changes', () => {
  const renderCount = { highlighting: 0, preferences: 0 };
  
  // Render consumers and track renders
  // Update highlighting
  // Verify only highlighting consumers re-rendered
});
```
