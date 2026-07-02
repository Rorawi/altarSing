'use client';

import { useEffect, useState } from 'react';
import { useYouTubePlayer } from '@/lib/youtube-player-context';

export default function YouTubePlayer() {
  const {
    activeSong,
    playerState,
    isPlaying,
    play,
    pause,
    close,
    minimize,
    openLyricsModal,
    setPlayerState,
  } = useYouTubePlayer();

  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      const isIOSDevice = /ipad|iphone|ipod/.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOS(!!isIOSDevice);
    }
  }, []);

  // Determine wrapper class based on state
  let wrapperClass = "hidden pointer-events-none w-0 h-0 absolute -left-[9999px]";

  if (activeSong) {
    if (playerState === 'hidden' || playerState === 'persistent') {
      wrapperClass = "hidden pointer-events-none w-0 h-0 absolute -left-[9999px]";
    } else if (playerState === 'modal') {
      wrapperClass = "fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-80 bg-slate-900 border-t border-slate-800 shadow-2xl flex flex-col transition-all duration-300";
    } else if (playerState === 'pip') {
      wrapperClass = "fixed bottom-20 right-4 w-40 h-28 bg-slate-950 rounded-xl shadow-2xl z-90 border border-slate-700 overflow-hidden flex flex-col transition-all duration-300";
    }
  }

  return (
    <>
      {/* 1. Video Player Container (Modal or PiP) */}
      <div className={wrapperClass}>
        {activeSong && playerState === 'modal' && (
          <>
            {isIOS && activeSong.youtubeLink && (
              <div className="bg-amber-500/20 text-amber-200 text-[11px] px-3 py-1.5 border-b border-amber-500/30 flex items-center justify-between select-none">
                <span>For background playback on iOS, open in app:</span>
                <a
                  href={activeSong.youtubeLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase transition-colors shrink-0 ml-2"
                >
                  Open YouTube
                </a>
              </div>
            )}
            <div className="bg-slate-900 text-white flex items-center justify-between px-4 py-2 border-b border-slate-800 select-none">
              <span className="text-xs font-semibold truncate flex-1 mr-4">
                📺 {activeSong.title}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={minimize}
                  className="text-slate-400 hover:text-white p-1 text-sm transition-colors"
                  title="Minimize to Floating PiP"
                >
                  🗗
                </button>
                <button
                  onClick={close}
                  className="text-slate-400 hover:text-red-400 p-1 text-sm transition-colors"
                  title="Close Player"
                >
                  ✕
                </button>
              </div>
            </div>
          </>
        )}

        {activeSong && playerState === 'pip' && (
          <div className="bg-slate-900 text-white flex items-center justify-between px-2 py-1 border-b border-slate-800 text-[10px] select-none">
            <span className="truncate flex-1 font-medium mr-2">{activeSong.title}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setPlayerState('modal')}
                className="hover:text-violet-400 transition-colors text-[9px]"
                title="Restore"
              >
                ⤢
              </button>
              <button
                onClick={close}
                className="hover:text-red-400 transition-colors text-[9px]"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* This div must ALWAYS be rendered in the same location in the JSX tree */}
        <div
          className={`bg-black relative transition-all duration-300 ${activeSong && playerState === 'modal' ? 'h-40 w-full' :
              activeSong && playerState === 'pip' ? 'flex-1 min-h-0 w-full' :
                'w-0 h-0 overflow-hidden'
            }`}
        >
          <div id="yt-player-element" className="w-full h-full absolute inset-0" />
        </div>
      </div>

      {/* 2. Persistent Playback Bar (Visible when lyrics modal is closed, but player is paused/active) */}
      {activeSong && playerState === 'persistent' && (
        <div
          onClick={openLyricsModal}
          className="fixed bottom-20 left-0 right-0 max-w-[430px] mx-auto z-80 bg-slate-900 hover:bg-slate-850 text-white px-4 py-2.5 flex items-center justify-between border-t border-slate-800 shadow-lg cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 select-none">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Playing:
            </span>
            <span className="text-xs font-bold truncate text-white">
              {activeSong.title}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={isPlaying ? pause : play}
              className="bg-violet-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold hover:bg-violet-700 transition-colors text-xs"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={close}
              className="text-slate-400 hover:text-red-400 p-1 text-sm font-semibold transition-colors"
              title="Close Player"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
