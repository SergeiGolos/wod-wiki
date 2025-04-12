# Chromecast Working Example

## Client

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
### Receiver

```typescript

'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { QRCodeSVG } from 'qrcode.react';

const supabase = createClient();

export default function CastReceiverPage() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    const initializeReceiver = () => {
      const context = window.cast?.framework?.CastReceiverContext.getInstance();
      if (!context) {
        console.error('Cast Receiver Context not available');
        return;
      }

      // Set up custom messaging with correct namespace format
      const channelName = 'urn:x-cast:com.google.cast.cac';
      context.addCustomMessageListener(channelName, (event: chrome.cast.framework.CustomMessageEvent) => {
        const { roomCode: newRoomCode } = event.data;
        if (newRoomCode && newRoomCode !== roomCode) {
          setRoomCode(newRoomCode);
          // Set up Supabase subscription for the room
          setupRoomSubscription(newRoomCode);
        }
      });

      // Start the receiver with custom options
      context.start({
        skipValidation: true,
        customNamespaces: {
          [channelName]: 'JSON'
        }
      });
    };

    const setupRoomSubscription = async (code: string) => {
      // First get the session ID
      const { data: session } = await supabase
        .from('sessions')
        .select('id')
        .eq('room_code', code)
        .eq('status', 'active')
        .single();

      if (session?.id) {
        // Subscribe to participant changes
        const channel = supabase
          .channel(`session:${session.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'participants',
              filter: `session_id=eq.${session.id}`,
            },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                setParticipants(prev => [...prev, payload.new]);
              } else if (payload.eventType === 'DELETE') {
                setParticipants(prev => prev.filter(p => p.id !== payload.old.id));
              } else if (payload.eventType === 'UPDATE') {
                setParticipants(prev =>
                  prev.map(p => p.id === payload.new.id ? payload.new : p)
                );
              }
            }
          )
          .subscribe();

        // Clean up subscription when room changes
        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    // Load the Cast Receiver SDK
    const script = document.createElement('script');
    script.src = '//www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
    script.onload = initializeReceiver;
    document.head.appendChild(script);

    return () => {
      const context = window.cast?.framework?.CastReceiverContext.getInstance();
      if (context) {
        context.stop();
      }
    };
  }, [roomCode]); // Add roomCode to dependencies

  if (!roomCode) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center py-2 w-full text-white bg-black">
        <h1 className="text-2xl font-bold">Waiting for session...</h1>
      </div>
    );
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/join/${roomCode}`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-2 w-full text-black bg-white">
      <h1 className="text-2xl font-bold mb-8">Session: {roomCode}</h1>      
      <div className="mb-8">
        <QRCodeSVG
          value={url}
          size={256}
          level="H"
        />
      </div>
      <h2 className="text-xl font-semibold mb-4">Scan to Join</h2>      
      <p className="mb-8 text-lg">{url}</p> {/* Re-added the URL display */}
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-4">Participants ({participants.length})</h2>
        <ul className="space-y-2">
          {participants.map((participant) => (
            <li key={participant.id} className="text-lg">
              {participant.display_name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

```
