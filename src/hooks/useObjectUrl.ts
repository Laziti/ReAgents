import { useEffect, useState, useRef } from 'react';

/**
 * Hook to safely manage object URLs
 * Automatically revokes URLs on cleanup
 */
export function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    // Revoke previous URL if it exists
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }

    // Create new URL if file exists
    if (file) {
      const newUrl = URL.createObjectURL(file);
      urlRef.current = newUrl;
      setUrl(newUrl);
    } else {
      setUrl(null);
    }

    // Cleanup on unmount or file change
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, [file]);

  return url;
}

/**
 * Hook to safely manage multiple object URLs
 */
export function useObjectUrls(files: File[]): string[] {
  const [urls, setUrls] = useState<string[]>([]);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    // Revoke all previous URLs
    urlsRef.current.forEach(url => URL.revokeObjectURL(url));
    urlsRef.current = [];

    // Create new URLs for all files
    if (files.length > 0) {
      const newUrls = files.map(file => URL.createObjectURL(file));
      urlsRef.current = newUrls;
      setUrls(newUrls);
    } else {
      setUrls([]);
    }

    // Cleanup on unmount or files change
    return () => {
      urlsRef.current.forEach(url => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, [files]);

  return urls;
}

