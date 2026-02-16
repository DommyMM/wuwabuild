'use client';

import { useState, ImgHTMLAttributes } from 'react';
import { ImagePaths } from '@/lib/paths';

interface AssetImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  paths: ImagePaths;
}

export const AssetImage: React.FC<AssetImageProps> = ({ paths, alt, ...props }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const src = failedSrc === paths.cdn ? paths.local : paths.cdn;

  return (
    <img
      src={src}
      alt={alt}
      onError={() => {
        if (paths.local !== paths.cdn) setFailedSrc(paths.cdn);
      }}
      {...props}
    />
  );
};

export default AssetImage;
