import { useState } from 'react';

import { cx } from '@/lib/cx';

const ITEM_IMAGE_BASE = 'https://api.flyff.com/image/item/';
const CLASS_IMAGE_BASE = 'https://api.flyff.com/image/class/target/';
const SKILL_IMAGE_BASE = 'https://api.flyff.com/image/skill/colored/';

interface GameImageProps {
  src: string;
  size: number;
  alt?: string | undefined;
  className?: string | undefined;
}

/** Lazy game image with a blank tile fallback when the API image fails to load. */
function GameImage({ src, size, alt = '', className }: GameImageProps) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  let image;

  if (failed) {
    image = (
      <span
        aria-hidden="true"
        className={cx('inline-block shrink-0 rounded-[4px] bg-control', className)}
        style={style}
      />
    );
  } else {
    image = (
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => {
          setFailed(true);
        }}
        className={cx(
          'inline-block shrink-0 object-contain [image-rendering:pixelated]',
          className,
        )}
        style={style}
      />
    );
  }

  return image;
}

export function ItemIcon({
  icon,
  size = 26,
  alt,
  className,
}: {
  icon: string;
  size?: number | undefined;
  alt?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <GameImage src={`${ITEM_IMAGE_BASE}${icon}`} size={size} alt={alt} className={className} />
  );
}

export function ClassIcon({
  icon,
  size = 26,
  alt,
  className,
}: {
  icon: string;
  size?: number | undefined;
  alt?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <GameImage src={`${CLASS_IMAGE_BASE}${icon}`} size={size} alt={alt} className={className} />
  );
}

export function SkillIcon({
  icon,
  size = 26,
  alt,
  className,
}: {
  icon: string;
  size?: number | undefined;
  alt?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <GameImage src={`${SKILL_IMAGE_BASE}${icon}`} size={size} alt={alt} className={className} />
  );
}
