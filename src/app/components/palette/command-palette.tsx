'use client'

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogPanel,
  DialogBackdrop,
} from '@headlessui/react'
import { ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import { UsersIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'
import { people, Person } from './people'
import Image from 'next/image'

const recent = [people[5], people[4], people[2], people[10], people[16]]

function classNames(...classes : string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function CommandPalette() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
    }, [])

  const filteredPeople =
    query === ''
      ? []
      : people.filter((person) => {
          return person.name.toLowerCase().includes(query.toLowerCase())
        })

        
  return (
    <>    
    <div className={classNames('max-w-2xl mx-auto transform transition-all duration-200 ease-in-out', open ? 'scale-95 opacity-0 hidden' : 'scale-100 opacity-100')}>
        <div 
            onClick={() => setOpen(true)} 
            className="cursor-pointer relative flex items-center h-8 rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
        >
            <MagnifyingGlassIcon 
          className="pointer-events-none absolute left-4 size-5 text-gray-400" 
          aria-hidden="true" 
            />
            <div className="ml-11 text-sm text-gray-500">Search... (Ctrl + k)</div>
        </div>
    </div>
    <Dialog
      className="relative z-10"
      open={open}
      onClose={() => {
        setOpen(false)
        setQuery('')
      }}
    >
      
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/25 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
        <DialogPanel
          transition
          className="mx-auto max-w-3xl transform divide-y divide-gray-100 overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition-all data-[closed]:scale-95 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
        >
          <Combobox
            onChange={(person) => {
              if (person) {
                window.location = person.url
              }
            }}
          >
            {( activeOption : Person) => {
                console.log("Active option: ", activeOption);
                return (<div>
                <div className="grid grid-cols-1">
                  <ComboboxInput
                    autoFocus
                    className="col-start-1 row-start-1 h-12 w-full pl-11 pr-4 text-base text-gray-900 outline-none placeholder:text-gray-400 sm:text-sm"
                    placeholder="Search..."
                    onChange={(event) => setQuery(event.target.value)}
                    onBlur={() => setQuery('')}
                  />
                  <MagnifyingGlassIcon
                    className="pointer-events-none col-start-1 row-start-1 ml-4 size-5 self-center text-gray-400"
                    aria-hidden="true"
                  />
                </div>

                {(query === '' || filteredPeople.length > 0) && (
                  <ComboboxOptions as="div" static hold className="flex transform-gpu divide-x divide-gray-100">
                    <div
                      className={classNames(
                        'max-h-96 min-w-0 flex-auto scroll-py-4 overflow-y-auto px-6 py-4',
                        activeOption && 'sm:h-96',
                      )}
                    >
                      {query === '' && (
                        <h2 className="mb-4 mt-2 text-xs font-semibold text-gray-500">Recent searches</h2>
                      )}
                      <div className="-mx-2 text-sm text-gray-700">
                        {(query === '' ? recent : filteredPeople).map((person) => (
                          <ComboboxOption
                            as="div"
                            key={person.id}
                            value={person}
                            className="group flex cursor-default select-none items-center rounded-md p-2 data-[focus]:bg-gray-100 data-[focus]:text-gray-900 data-[focus]:outline-none"
                          >
                            {/* <img src={person.imageUrl} alt="" className="size-6 flex-none rounded-full" /> */}
                            <span className="ml-3 flex-auto truncate">{person.name}</span>
                            <ChevronRightIcon
                              className="ml-3 hidden size-5 flex-none text-gray-400 group-data-[focus]:block"
                              aria-hidden="true"
                            />
                          </ComboboxOption>
                        ))}
                      </div>
                    </div>
                    {activeOption && (<div className="hidden h-96 w-1/2 flex-none flex-col divide-y divide-gray-100 overflow-y-auto sm:flex">
                        <div className="flex-none p-6 text-center">
                          <Image src={activeOption.imageUrl} alt="" className="mx-auto size-16 rounded-full" />
                          <h2 className="mt-3 font-semibold text-gray-900">{activeOption.name}</h2>
                          <p className="text-sm/6 text-gray-500">{activeOption.role}</p>
                        </div>
                        <div className="flex flex-auto flex-col justify-between p-6">
                          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm text-gray-700">
                            <dt className="col-end-1 font-semibold text-gray-900">Phone</dt>
                            <dd>{activeOption.phone}</dd>
                            <dt className="col-end-1 font-semibold text-gray-900">URL</dt>
                            <dd className="truncate">
                              <a href={activeOption.url} className="text-indigo-600 underline">
                                {activeOption.url}
                              </a>
                            </dd>
                            <dt className="col-end-1 font-semibold text-gray-900">Email</dt>
                            <dd className="truncate">
                              <a href={`mailto:${activeOption.email}`} className="text-indigo-600 underline">
                                {activeOption.email}
                              </a>
                            </dd>
                          </dl>
                          <button
                            type="button"
                            className="mt-6 w-full flex items-center justify-center px-3 py-1 rounded-full transition-all bg-white text-blue-600 hover:bg-blue-50 border border-blue-200"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    )} 
                  </ComboboxOptions>
                )}

                {query !== '' && filteredPeople.length === 0 && (
                  <div className="px-6 py-14 text-center text-sm sm:px-14">
                    <UsersIcon className="mx-auto size-6 text-gray-400" aria-hidden="true" />
                    <p className="mt-4 font-semibold text-gray-900">No people found</p>
                    <p className="mt-2 text-gray-500">We couldn’t find anything with that term. Please try again.</p>
                  </div>
                )}
              </div>
            )}}
          </Combobox>
        </DialogPanel>
      </div>
    </Dialog>
    </>
  )
}