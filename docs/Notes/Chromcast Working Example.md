
```TypeScript

'use client'

  

import React, { useEffect, useState, useRef } from 'react'

import { usePathname } from 'next/navigation'

  

const CastControls: React.FC = () => {

  const [castAvailable, setCastAvailable] = useState(false)

  const castButtonRef = useRef<HTMLButtonElement>(null)

  const castSessionRef = useRef<chrome.cast.Session | null>(null)

  const pathname = usePathname()

  

  // Extract room code from pathname if we're on a host page

  const roomCode = pathname?.startsWith('/host/') ? pathname.split('/').pop() : null

  

  useEffect(() => {

    const initializeCastApi = () => {

      if (!window.chrome || !window.chrome.cast) {

        console.log('Cast SDK not available yet.')

        return

      }

      console.log('Cast SDK available.')

  

      const sessionRequest = new chrome.cast.SessionRequest(

        process.env.NEXT_PUBLIC_CAST_APPLICATION_ID || ''

      )

      const apiConfig = new chrome.cast.ApiConfig(

        sessionRequest,

        (session) => {

          // Session listener

          console.log('New session', session)

          castSessionRef.current = session

          // If we have a room code, send it to the receiver

          if (roomCode) {

            const message = { roomCode }

            session.sendMessage('urn:x-cast:com.google.cast.cac', message,

              () => console.log('Message sent successfully'),

              (error) => console.error('Failed to send message:', error)

            )

          }

        },

        (availability) => { // receiver listener

          console.log('Receiver availability:', availability)

          if (availability === chrome.cast.ReceiverAvailability.AVAILABLE) {

            setCastAvailable(true)

          } else {

            setCastAvailable(false)

          }

        }

      )

  

      chrome.cast.initialize(

        apiConfig,

        () => {

          console.log('Cast API initialized successfully.')

          // Initialize the Cast button after API is ready

          if (window.google && window.google.cast && window.google.cast.framework) {

            const castContext = window.google.cast.framework.CastContext.getInstance();

            castContext.setOptions({

              receiverApplicationId: process.env.NEXT_PUBLIC_CAST_APPLICATION_ID || ''

            });

          }

        },

        (error) => console.error('Cast API initialization failed:', error)

      )

    }

  

    // Set up the callback function for when the Cast API is available

    window.__onGCastApiAvailable = (available, reason) => {

      console.log('Cast API available:', available, reason || '')

      if (available) {

        initializeCastApi()

      } else {

        console.error('Google Cast SDK could not be loaded.')

      }

    }

  

    // If the Cast API is already available, initialize it directly

    if (window.chrome && window.chrome.cast && window.chrome.cast.isAvailable) {

      initializeCastApi()

    }

  

    return () => {

      // Cleanup

      window.__onGCastApiAvailable = undefined;

    }

  }, [roomCode]) // Add roomCode to dependencies

  

  const handleCastClick = () => {

    if (!window.chrome || !window.chrome.cast) return;

    chrome.cast.requestSession(

      (session) => {

        console.log('Session started', session)

        castSessionRef.current = session

        // Send room code to receiver when session starts

        if (roomCode) {

          const message = { roomCode }

          session.sendMessage('urn:x-cast:com.google.cast.cac',  message,

            () => console.log('Room code sent to receiver'),

            (error) => console.error('Failed to send room code:', error)

          )

        }

      },

      (error) => {

        console.error('Error starting cast session:', error)

      }

    )

  }

  

  // Only show cast button on host pages

  if (!roomCode) return null;

  

  return (

    <div>

      {castAvailable ? (

        <button

          ref={castButtonRef}

          onClick={handleCastClick}

          className="cast-button"

          style={{

            width: '32px',

            height: '32px',

            border: 'none',

            background: 'url("https://www.gstatic.com/images/icons/material/system/2x/cast_black_24dp.png") center/cover no-repeat',

            cursor: 'pointer'

          }}

          aria-label="Cast to device"

        />

      ) : (

        <button

          disabled

          style={{

            width: '32px',

            height: '32px',

            border: 'none',

            background: 'url("https://www.gstatic.com/images/icons/material/system/2x/cast_disabled_black_24dp.png") center/cover no-repeat',

            opacity: 0.5,

            cursor: 'not-allowed'

          }}

          aria-label="No Cast devices found"

        />

      )}      

    </div>

  )

}

  

export default CastControls

```