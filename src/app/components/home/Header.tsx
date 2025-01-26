'use client';
import Image from 'next/image'
import logo from '@/../public/logo.png';
import CommandPalette from '../palette/command-palette';

interface HeaderProps {
  handleSignOut: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

export function Header({ handleSignOut, setMobileMenuOpen }: HeaderProps) {
  return (
    <header className="bg-white">
      <nav aria-label="Global" className="mx-auto flex max-w-6xl items-center justify-between p-6 lg:px-10">
        <div className="flex lg:flex-1">
          <a href="#" className="-m-1.5 p-1.5">
            <span className="sr-only">Wod.wiki</span>
            <Image
              alt=""
              src={logo}
              className="h-8 w-auto"
            />
          </a>
          <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 rotate-2">
            <span className='text-black/70'>Wod</span><span className="text-blue-900/70">.wiki</span>
          </h2>
        </div>
        <div className="px-3 w-[260px]">
          <CommandPalette />
        </div>
        <div className="hidden lg:flex lg:justify-end">
            <button
            onClick={handleSignOut}
            className="flex items-center px-3 py-1 rounded-full transition-all bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
            >
            <span className="mx-">Log out</span>            
            </button>
        </div>
      </nav>
    </header>
  );
}
