import { Chip } from '@/components/content';

/**
 * One platform in `data/release.json` (plan W16).
 *
 * Every field that can honestly be missing is nullable: a platform with no
 * published asset has no size and no digest, and the card says so rather than
 * showing a number nobody measured.
 */
export interface Platform {
  id: string;
  name: string;
  icon: string;
  arch: string | null;
  filename: string;
  sizeBytes: number | null;
  sizeLabel: string | null;
  sha256: string | null;
  url: string;
  buttonLabel: string;
  primary: boolean;
  tested: boolean;
  note: string;
}

/**
 * MiB, called MB — the unit a download page is read in, and the one GitHub
 * Releases reports asset sizes in. The byte count stays in release.json so the
 * number remains traceable to a measurement.
 */
export function formatSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function DownloadCard({ platform }: { platform: Platform }) {
  const size = platform.sizeBytes === null ? platform.sizeLabel : formatSize(platform.sizeBytes);

  return (
    <div className="ws-dlcard" data-primary={platform.primary ? 'true' : 'false'}>
      <span className="ws-dlcard-os">
        <span aria-hidden="true">{platform.icon}</span>
        {platform.name}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
          {platform.arch ? (
            <Chip tone={platform.primary ? 'acc' : undefined}>{platform.arch}</Chip>
          ) : null}
          {platform.tested ? null : <Chip tone="mod">untested</Chip>}
        </span>
      </span>

      <span className="ws-dlcard-sz">
        {platform.filename}
        {size ? ` · ${size}` : null}
      </span>

      <a
        className="ws-btn"
        data-variant={platform.primary ? 'primary' : 'default'}
        href={platform.url}
      >
        {platform.buttonLabel}
      </a>

      <p>{platform.note}</p>
    </div>
  );
}
