'use client';
import Image from 'next/image'
import { Popover, PopoverButton, PopoverGroup, PopoverPanel } from '@headlessui/react';
import { Bars3Icon, ChevronDownIcon } from '@heroicons/react/20/solid';
import { callsToAction, products } from './data';
import logo from '../../../public/logo.png';
import CommandPalette from '../components/pallet/command-palette';

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
        </div>
        <div className="px-3 w-[260px]">
          <CommandPalette />
        </div>
        <div className="hidden lg:flex lg:justify-end">
            <button
            onClick={handleSignOut}
            className="flex items-center px-3 py-1 rounded-full transition-all bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
            >
            <span className="mx-1">Log out</span>            
            </button>
        </div>
      </nav>
    </header>
  );
}
