"use client";
import { Provider } from "@supabase/supabase-js";
import { login } from "./actions";
import { JSX } from "react";
import logo from "@/../public/logo.png";
import Image from "next/image";

export type ProviderButton = {
  provider: Provider;
  icon: JSX.Element;
  label: string;
};
export default function LoginPage() {
  const providers: ProviderButton[] = [
    {
      provider: "github",
      icon: (
        <svg
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
          className="size-5 fill-[#24292F]"
        >
          <path
            d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
            clipRule="evenodd"
            fillRule="evenodd"
          />
        </svg>
      ),
      label: "GitHub",
    },
    {
      provider: "google",
      icon: (<svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48" className="size-5">
        <defs>
          <path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
        </defs>
        <clipPath id="b">
          <use xlinkHref="#a" overflow="visible"/>
        </clipPath>
        <path clipPath="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/>
        <path clipPath="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/>
        <path clipPath="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z"/>
        <path clipPath="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3 35-10z"/>
      </svg>),
      label: "Google",
    }
  ];

  return (
    <>
      <div className="flex min-h-full flex-1 flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
          <div className="bg-white px-6 py-12 shadow-xl sm:rounded-lg sm:px-12">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
              <h2 className="-mb-1 text-center text-8xl font-bold tracking-tight text-gray-900 rotate-6">
                <span>Wod</span><span className="text-blue-900">.wiki</span>
              </h2>
              <Image src={logo} alt="logo" />
              
              <div className="mt-5 grid grid-rows-2 gap-4">
                {providers.map((provider) => (
                  <button 
                    key={provider.provider}
                    type="button"
                    onClick={() =>login(provider.provider) }
                    className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent"
                  >
                    {provider.icon}
                    <span className="text-sm/6 font-semibold">
                      {provider.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* <p className="mt-10 text-center text-sm/6 text-gray-500">
              Not a member?{' '}
              <a href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">
                Start a 14 day free trial
              </a>
            </p> */}
        </div>
      </div>
    </>
  );
}
