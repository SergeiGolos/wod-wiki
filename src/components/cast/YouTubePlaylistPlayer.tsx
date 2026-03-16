/**
 * YouTubePlaylistPlayer
 *
 * A visually compact/hidden YouTube player component that plays a playlist.
 * Designed to run on the Chromecast Receiver. Exposes state changes to the UI
 * and accepts playback controls.
 */

import React, { useState, useImperativeHandle, forwardRef, useRef } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';

export interface YouTubePlaylistPlayerProps {
    /** The playlist ID extracted from the frontmatter URL */
    playlistId: string;
    /** Callback when the player's internal state changes (e.g. playing, paused) */
    onStateChange?: (state: number) => void;
    /** Callback when the track changes or title is retrieved */
    onTrackChange?: (title: string) => void;
}

export interface YouTubePlaylistPlayerRef {
    play: () => void;
    pause: () => void;
    next: () => void;
    previous: () => void;
    getPlayerState: () => number;
}

export const YouTubePlaylistPlayer = forwardRef<YouTubePlaylistPlayerRef, YouTubePlaylistPlayerProps>(({
    playlistId,
    onStateChange,
    onTrackChange
}, ref) => {
    const [playerReady, setPlayerReady] = useState(false);
    const playerRef = useRef<any>(null); // Type 'any' used because YouTubePlayer is not exported by react-youtube's types directly in a simple way

    useImperativeHandle(ref, () => ({
        play: () => {
            if (playerReady && playerRef.current) {
                playerRef.current.playVideo();
            }
        },
        pause: () => {
            if (playerReady && playerRef.current) {
                playerRef.current.pauseVideo();
            }
        },
        next: () => {
            if (playerReady && playerRef.current) {
                playerRef.current.nextVideo();
            }
        },
        previous: () => {
            if (playerReady && playerRef.current) {
                playerRef.current.previousVideo();
            }
        },
        getPlayerState: () => {
            if (playerReady && playerRef.current) {
                return playerRef.current.getPlayerState();
            }
            return -1; // unstarted
        }
    }));

    const handleReady: YouTubeProps['onReady'] = (event) => {
        playerRef.current = event.target;
        setPlayerReady(true);
        // Once ready, if we have a track title, report it immediately
        const data = event.target.getVideoData();
        if (data && data.title) {
            onTrackChange?.(data.title);
        }
    };

    const handleStateChange: YouTubeProps['onStateChange'] = (event) => {
        onStateChange?.(event.data);

        // YouTube Player States:
        // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
        if (event.data === 1 || event.data === 5 || event.data === -1) {
            const data = event.target.getVideoData();
            if (data && data.title) {
                onTrackChange?.(data.title);
            }
        }
    };

    const opts: YouTubeProps['opts'] = {
        height: '0',
        width: '0',
        playerVars: {
            // https://developers.google.com/youtube/player_parameters
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            listType: 'playlist',
            list: playlistId
        },
    };

    // Render an invisible player (height/width 0 in opts, plus absolute hidden container)
    return (
        <div style={{ position: 'absolute', top: -9999, left: -9999, width: 0, height: 0, overflow: 'hidden' }}>
            {playlistId && (
                <YouTube
                    opts={opts}
                    onReady={handleReady}
                    onStateChange={handleStateChange}
                />
            )}
        </div>
    );
});

YouTubePlaylistPlayer.displayName = 'YouTubePlaylistPlayer';
