import Icon from '@/components/Icon';
import { getMediaLinkInfo } from '@/lib/media';

export default function ExternalMediaLink({
  href,
  className = '',
}: {
  href: string;
  className?: string;
}) {
  const info = getMediaLinkInfo(href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${info.label} (opens in a new tab)`}
      className={`inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-violet-800 transition-colors hover:text-violet-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:text-violet-300 dark:hover:text-violet-200 ${className}`}
    >
      <Icon name={info.icon} size={14} />
      <span>{info.label}</span>
    </a>
  );
}
