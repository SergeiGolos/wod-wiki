export const PAGE_SHELL_CONTENT_SURFACE_CLASS =
  'bg-background ring-1 ring-zinc-950/5 shadow-sm lg:shadow-[-18px_0_36px_-28px_rgba(15,23,42,0.16),18px_0_36px_-28px_rgba(15,23,42,0.16)] dark:shadow-none dark:ring-white/10';

/**
 * Standard content column sizing for page shells.
 * At 1280px (xl), content halts growth at 984px (1280px viewport - 56px AppRail - 240px NavSidebar),
 * allowing right-side padding to grow until the 240px secondary rail mounts at 2xl (1520px).
 * At 3xl (1800px+), caps at max-w-7xl to maintain comfortable reading width on ultra-wide screens.
 */
export const PAGE_SHELL_CONTAINER_CLASS =
  'flex flex-col flex-1 min-w-0 xl:max-w-[984px] 2xl:max-w-none 3xl:max-w-7xl min-h-screen lg:rounded-[2.5rem]';