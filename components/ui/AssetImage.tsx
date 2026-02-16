'use client';

import { useState, useEffect, ImgHTMLAttributes } from 'react';
import { ImagePaths } from '@/lib/paths';

interface AssetImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  paths: ImagePaths;
}

export const AssetImage: React.FC<AssetImageProps> = ({ paths, alt, ...props }) => {
  const [src, setSrc] = useState(paths.cdn);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError && paths.local !== paths.cdn) {
      setHasError(true);
      setSrc(paths.local);
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      {...props}
    />
  );
};

export default AssetImage;
