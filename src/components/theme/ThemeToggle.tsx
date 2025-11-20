import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
    const { setTheme, theme } = useTheme()

    return (
        <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 w-9">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
            </MenuButton>
            <MenuItems
                transition
                className="absolute right-0 z-50 mt-2 w-36 origin-top-right rounded-md border border-border bg-popover p-1 shadow-md transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
            >
                <MenuItem>
                    <button
                        onClick={() => setTheme("light")}
                        className="group flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground data-[focus]:bg-accent data-[focus]:text-accent-foreground"
                    >
                        <Sun className="h-4 w-4" />
                        <span>Light</span>
                        {theme === 'light' && <span className="ml-auto text-xs opacity-60">✓</span>}
                    </button>
                </MenuItem>
                <MenuItem>
                    <button
                        onClick={() => setTheme("dark")}
                        className="group flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground data-[focus]:bg-accent data-[focus]:text-accent-foreground"
                    >
                        <Moon className="h-4 w-4" />
                        <span>Dark</span>
                        {theme === 'dark' && <span className="ml-auto text-xs opacity-60">✓</span>}
                    </button>
                </MenuItem>
                <MenuItem>
                    <button
                        onClick={() => setTheme("system")}
                        className="group flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground data-[focus]:bg-accent data-[focus]:text-accent-foreground"
                    >
                        <Monitor className="h-4 w-4" />
                        <span>System</span>
                        {theme === 'system' && <span className="ml-auto text-xs opacity-60">✓</span>}
                    </button>
                </MenuItem>
            </MenuItems>
        </Menu>
    )
}
