'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getSongYoutubeLink } from '@/lib/actions';

export interface ActiveSong {
  title: string;
  songId?: string | null;
  rehearsalSongId?: string | null;
  collectionSongId?: string | null;
  youtubeLink?: string | null;
  initialLyrics?: string | null;
}

export type PlayerState = 'hidden' | 'modal' | 'persistent' | 'pip';

interface YouTubePlayerContextType {
  activeSong: ActiveSong | null;
  playerState: PlayerState;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLyricsModalOpen: boolean;
  loadSong: (song: ActiveSong) => void;
  play: () => void;
  pause: () => void;
  close: () => void;
  minimize: () => void;
  openLyricsModal: () => void;
  closeLyricsModal: () => void;
  setPlayerState: (state: PlayerState) => void;
  playerContainerRef: React.RefObject<HTMLDivElement | null>;
  ytPlayer: any;
}

const YouTubePlayerContext = createContext<YouTubePlayerContextType | undefined>(undefined);

export function getYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

export function YouTubePlayerProvider({ children }: { children: React.ReactNode }) {
  const [activeSong, setActiveSong] = useState<ActiveSong | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('hidden');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLyricsModalOpen, setIsLyricsModalOpen] = useState(false);
  
  const playerRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const [apiReady, setApiReady] = useState(false);

  // Load YouTube API script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if YT script callback exists
    const previousCallback = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (previousCallback) previousCallback();
      setApiReady(true);
    };

    if ((window as any).YT && (window as any).YT.Player) {
      setApiReady(true);
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    } else {
      // Script tag exists but API not yet marked ready
      const checkYTApi = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          setApiReady(true);
          clearInterval(checkYTApi);
        }
      }, 100);
      return () => clearInterval(checkYTApi);
    }
  }, []);

  const startProgressTimer = useCallback(() => {
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        setCurrentTime(time || 0);
        setDuration(dur || 0);
      }
    }, 500);
  }, []);

  const stopProgressTimer = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  // Handle Player State Changes
  const onPlayerStateChange = useCallback((event: any) => {
    const state = event.data;
    if (state === 1) { // YT.PlayerState.PLAYING
      setIsPlaying(true);
      startProgressTimer();
    } else {
      setIsPlaying(false);
      stopProgressTimer();
    }
  }, [startProgressTimer, stopProgressTimer]);

  const initPlayer = useCallback((videoId: string) => {
    if (!apiReady || typeof window === 'undefined' || !(window as any).YT) return;
    
    // Check if the DOM element exists
    const el = document.getElementById('yt-player-element');
    if (!el) return;

    try {
      playerRef.current = new (window as any).YT.Player('yt-player-element', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event: any) => {
            event.target.playVideo();
            const dur = event.target.getDuration();
            setDuration(dur || 0);
          },
          onStateChange: onPlayerStateChange,
        },
      });
    } catch (err) {
      console.error('Failed to init YT player:', err);
    }
  }, [apiReady, onPlayerStateChange]);

  const loadSong = useCallback(async (song: ActiveSong) => {
    let link = song.youtubeLink;
    if (!link && (song.songId || song.rehearsalSongId || song.collectionSongId)) {
      try {
        link = await getSongYoutubeLink({
          songId: song.songId,
          rehearsalSongId: song.rehearsalSongId,
          collectionSongId: song.collectionSongId,
        });
      } catch (err) {
        console.error('Error fetching youtube link:', err);
      }
    }

    const videoId = getYouTubeId(link);
    if (!videoId) {
      alert('Could not extract a valid YouTube video ID from the saved link.');
      return;
    }

    const updatedSong = { ...song, youtubeLink: link };
    setActiveSong(updatedSong);
    setPlayerState('modal');
    setIsLyricsModalOpen(true);

    if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
      try {
        playerRef.current.loadVideoById(videoId);
        playerRef.current.playVideo();
      } catch (err) {
        initPlayer(videoId);
      }
    } else {
      setTimeout(() => {
        initPlayer(videoId);
      }, 200);
    }
  }, [initPlayer]);

  const play = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      playerRef.current.playVideo();
    }
  }, []);

  const pause = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
      playerRef.current.pauseVideo();
    }
  }, []);

  const close = useCallback(() => {
    if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
      try {
        playerRef.current.stopVideo();
      } catch (e) {}
    }
    setActiveSong(null);
    setPlayerState('hidden');
    setIsPlaying(false);
    stopProgressTimer();
  }, [stopProgressTimer]);

  const minimize = useCallback(() => {
    setPlayerState('pip');
  }, []);

  const openLyricsModal = useCallback(() => {
    setIsLyricsModalOpen(true);
    if (playerState === 'persistent') {
      setPlayerState('modal');
    }
  }, [playerState]);

  const closeLyricsModal = useCallback(() => {
    setIsLyricsModalOpen(false);
    if (playerState === 'modal') {
      pause();
      setPlayerState('persistent');
    }
  }, [playerState, pause]);

  return (
    <YouTubePlayerContext.Provider
      value={{
        activeSong,
        playerState,
        isPlaying,
        currentTime,
        duration,
        isLyricsModalOpen,
        loadSong,
        play,
        pause,
        close,
        minimize,
        openLyricsModal,
        closeLyricsModal,
        setPlayerState,
        playerContainerRef,
        ytPlayer: playerRef.current,
      }}
    >
      {children}
    </YouTubePlayerContext.Provider>
  );
}

export function useYouTubePlayer() {
  const context = useContext(YouTubePlayerContext);
  if (context === undefined) {
    throw new Error('useYouTubePlayer must be used within a YouTubePlayerProvider');
  }
  return context;
}
