Currently the organization is a little messy and realistically there are three different high level groupings that this code is currently supporting that I want to break up into their individual logical groupings as directories under the source. the first and most basic piece of this is the core WadWiki library and that generates an MPM package. This includes all of the parsers, the code mirror integrations, the individual panels that are shared between all the different workbenches, the core interfaces that allow all the workbenches to work basically and this should be able to be shared between different solutions using npm. So there needs to be an NPM build for this.

The next piece of this is the storybook project. This is where all the development goes. There are several different types of controls and components that are required by the storybook and how it displays in order to be able to maintain state in the environment that it's set up in. All of that logic should go into its own directory called stories. And should be organized under there based on the same structure that it's organized in the storybook.

The next piece of this is the storybook project. This is where all the development goes. There are several different types of controls and components that are required by the storybook and how it displays in order to be able to maintain state in the environment that it's set up in. All of that logic should go into its own directory called stories. And should be organized under there based on the same structure that it's organized in the storybook.

critical piece of this work is that at the end of this we should be able to build all three correctly.

Big ticket components that are composed of many other components can have their own directories in order to keep the logical organization under the components folders. Things like components that are only visible on the tracker can exist in a special tracker component directory.

expected build commands

bun run storybook -> runs the storybook project
bun run build-storybook -> builds the storybook project

bun run build-library -> builds the npm package for the soution
bun run test-libary -> runs the unit tests in the storybook

bun run playground -> runs the vite app
bun run build-playground -> builds the vite app to a static page.

be mindful of the shared srouces like the markdown files for the differnt workouts.