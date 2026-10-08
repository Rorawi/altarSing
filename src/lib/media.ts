import type { IconName } from '@/components/Icon';

export type MediaLinkInfo = { label: string; icon: IconName };

export function getMediaLinkInfo(href: string): MediaLinkInfo {
  let host = '';
  try {
    host = new URL(href).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return { label: 'Open link', icon: 'external' };
  }

  if (host === 'youtu.be' || host.endsWith('youtube.com')) {
    return { label: 'Watch on YouTube', icon: 'play' };
  }
  if (host.endsWith('spotify.com')) return { label: 'Open Spotify', icon: 'music' };
  if (host.endsWith('tiktok.com')) return { label: 'Open TikTok', icon: 'music' };
  if (host.endsWith('instagram.com')) return { label: 'Open Instagram', icon: 'external' };
  if (host.endsWith('soundcloud.com')) return { label: 'Open SoundCloud', icon: 'play' };
  return { label: 'Open link', icon: 'external' };
}
