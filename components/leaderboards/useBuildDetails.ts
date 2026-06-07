'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getBuildById, LBBuildDetailEntry } from '@/lib/lb';

type DetailErrorMap = Record<string, string | null>;
type DetailLoadingMap = Record<string, boolean>;
type DetailMap = Record<string, LBBuildDetailEntry>;

export function useBuildDetails() {
  const [detailById, setDetailById] = useState<DetailMap>({});
  const [detailLoadingById, setDetailLoadingById] = useState<DetailLoadingMap>({});
  const [detailErrorById, setDetailErrorById] = useState<DetailErrorMap>({});
  const detailByIdRef = useRef<DetailMap>(detailById);
  const detailLoadingByIdRef = useRef<DetailLoadingMap>(detailLoadingById);
  const detailControllersRef = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    detailByIdRef.current = detailById;
  }, [detailById]);

  useEffect(() => {
    detailLoadingByIdRef.current = detailLoadingById;
  }, [detailLoadingById]);

  const abortAllBuildDetailRequests = useCallback(() => {
    Object.values(detailControllersRef.current).forEach((controller) => controller.abort());
    detailControllersRef.current = {};
  }, []);

  const resetBuildDetailRequestState = useCallback(() => {
    abortAllBuildDetailRequests();
    setDetailLoadingById({});
    setDetailErrorById({});
    detailLoadingByIdRef.current = {};
  }, [abortAllBuildDetailRequests]);

  const loadBuildDetail = useCallback((buildId: string, force = false) => {
    const normalizedBuildId = buildId.trim();
    if (!normalizedBuildId) return;
    if (!force && (detailByIdRef.current[normalizedBuildId] || detailLoadingByIdRef.current[normalizedBuildId])) {
      return;
    }

    detailControllersRef.current[normalizedBuildId]?.abort();
    const controller = new AbortController();
    detailControllersRef.current[normalizedBuildId] = controller;

    setDetailLoadingById((prev) => {
      const next = { ...prev, [normalizedBuildId]: true };
      detailLoadingByIdRef.current = next;
      return next;
    });
    setDetailErrorById((prev) => ({ ...prev, [normalizedBuildId]: null }));

    void getBuildById(normalizedBuildId, controller.signal)
      .then((detail) => {
        setDetailById((prev) => {
          const next = { ...prev, [normalizedBuildId]: detail };
          detailByIdRef.current = next;
          return next;
        });
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        setDetailErrorById((prev) => ({
          ...prev,
          [normalizedBuildId]: fetchError instanceof Error ? fetchError.message : 'Failed to load build details.',
        }));
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setDetailLoadingById((prev) => {
          const next = { ...prev, [normalizedBuildId]: false };
          detailLoadingByIdRef.current = next;
          return next;
        });
        delete detailControllersRef.current[normalizedBuildId];
      });
  }, []);

  const retryBuildDetail = useCallback((buildId: string) => {
    loadBuildDetail(buildId, true);
  }, [loadBuildDetail]);

  useEffect(() => abortAllBuildDetailRequests, [abortAllBuildDetailRequests]);

  return {
    detailById,
    detailLoadingById,
    detailErrorById,
    loadBuildDetail,
    retryBuildDetail,
    resetBuildDetailRequestState,
  };
}
