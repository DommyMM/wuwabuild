export interface EchoOCRData {
  name: { name: string; id: string; confidence: number };
  main: { name: string; value: string };
  substats: Array<{ name: string; value: string }>;
  element: string;
  setId?: number | null;
}

export interface AnalysisData {
  character?: { name: string; id?: string; level: number; element?: string };
  watermark?: { username: string; uid: number };
  weapon?: { name: string; id?: string; level: number };
  /** Five levels in OCR order: normal, skill, circuit, intro, liberation */
  forte?: { levels: number[] };
  /** Sequence node count, 0-6 */
  sequences?: { sequence: number };
  echo1?: EchoOCRData;
  echo2?: EchoOCRData;
  echo3?: EchoOCRData;
  echo4?: EchoOCRData;
  echo5?: EchoOCRData;
}
