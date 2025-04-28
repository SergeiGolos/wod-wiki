import React from 'react';

// Only import if available (Storybook 6+)
let useStorybookApi: any;
try {
  // @ts-ignore
  useStorybookApi = require('@storybook/manager-api').useStorybookApi || require('@storybook/api').useStorybookApi;
} catch (e) {
  useStorybookApi = null;
}

export default {
  title: 'System/NotFound',
  parameters: { docs: { disable: true } }
};

export const NotFound = () => {
  if (useStorybookApi) {
    const api = useStorybookApi();
    const stories = Object.values(api.getStories() || {});
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <h1>404 – Story Not Found</h1>
        <p>The requested story does not exist.</p>
        <h3>Available Stories:</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {stories
            .filter(story => !story.title.startsWith('System/NotFound'))
            .map(story => (
              <li key={story.id}>
                <strong>{story.title}</strong>: {story.name}
              </li>
            ))}
        </ul>
      </div>
    );
  }

  // Fallback for Storybook versions without API
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <h1>404 – Story Not Found</h1>
      <p>The requested story does not exist.</p>
      <p>Use the sidebar to browse available stories.</p>
    </div>
  );
};
