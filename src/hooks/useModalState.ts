import { useState, useCallback } from "react";
import { ModalData, MetricType, TimeSeriesDataPoint } from "@/types/campaign";

/**
 * Hook for managing modal state across the application
 */
export const useModalState = () => {
  const [modalData, setModalData] = useState<ModalData>({
    isOpen: false,
    title: "",
    metricType: "impressions",
    data: []
  });

  const openModal = useCallback((
    metricType: MetricType,
    title: string,
    data: TimeSeriesDataPoint[]
  ) => {
    setModalData({
      isOpen: true,
      title,
      metricType,
      data
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalData(prev => ({
      ...prev,
      isOpen: false
    }));
  }, []);

  const updateModalData = useCallback((
    updates: Partial<Omit<ModalData, 'isOpen'>>
  ) => {
    setModalData(prev => ({
      ...prev,
      ...updates
    }));
  }, []);

  return {
    modalData,
    openModal,
    closeModal,
    updateModalData,
    setModalData
  };
};