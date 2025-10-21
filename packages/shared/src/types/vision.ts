import type { QuantityUnit } from './fridge';

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

export type RecognizedCandidate = {
  name: string;
  confidence: number;
  unit?: QuantityUnit;
  normalizedName?: string;
};

export type VisionRecognitionResult = {
  id: string;
  box: BoundingBox;
  candidates: RecognizedCandidate[];
  suggestedQty: number;
  suggestedUnit: QuantityUnit;
  barcode?: string | null;
  expiryText?: string | null;
};

export type VisionRecognizeRequest = {
  shelfId: string;
  images: string[];
};

export type VisionRecognizeResponse = {
  requestId: string;
  shelfId: string;
  results: VisionRecognitionResult[];
  inferenceDurationMs: number;
  modelVersion: string;
};
