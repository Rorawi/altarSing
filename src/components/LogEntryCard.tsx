"use client";

import type { ServiceLog, LogSong } from "@/types";

export default function LogEntryCard({ log }: { log: ServiceLog }) {
  const formattedDate = new Date(
    log.service_date + "T00:00:00",
  ).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Support both new multi-song format and legacy single-song entries
  const displaySongs: LogSong[] =
    log.songs && log.songs.length > 0
      ? log.songs
      : [{ title: log.song_title, key: log.musical_key, song_id: log.song_id }];

  const displayLeaders: string[] =
    log.lead_singers && log.lead_singers.length > 0
      ? log.lead_singers
      : log.lead_singer
        ? [log.lead_singer]
        : [];

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
      <div className="">
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Service moment badge */}
          <span className="inline-block bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-lg">
            {log.service_moment}
          </span>
          <p className="text-xs text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
            {formattedDate}
          </p>
        </div>
        {/* Songs list */}
        <div className="space-y-2">
          {displaySongs.map((song, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                {displaySongs.length > 1 && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium w-4 shrink-0">
                    {i + 1}.
                  </span>
                )}
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug flex-1 min-w-0 truncate">
                  {song.title}
                </p>
                {song.key && (
                  <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-lg shrink-0">
                    {song.key}
                  </span>
                )}
              </div>
              {song.tags && song.tags.length > 0 && (
                <div
                  className={`flex gap-1 flex-wrap mt-1 ${displaySongs.length > 1 ? "pl-6" : ""}`}
                >
                  {song.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Leaders */}
        {displayLeaders.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            <span className="mr-1">👤</span>
            {displayLeaders.join(", ")}
          </p>
        )}

        {log.notes && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic leading-relaxed">
            {log.notes}
          </p>
        )}
      </div>
    </div>
  );
}
