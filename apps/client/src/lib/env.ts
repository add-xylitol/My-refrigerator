export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
};

export const getVisionBaseUrl = () => {
  return import.meta.env.VITE_VISION_BASE_URL ?? getApiBaseUrl();
};
