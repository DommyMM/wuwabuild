export interface ImportRegion {
  x1: number; x2: number;
  y1: number; y2: number;
}

export interface EchoOCRData {
  name: { name: string; id: string; confidence: number };
  main: { name: string; value: string };
  substats: Array<{ name: string; value: string }>;
  element: string;
}

export interface AnalysisData {
  character?: { name: string; id?: string; level: number };
  watermark?: { username: string; uid: number };
  weapon?: { name: string; id?: string; level: number };
  forte?: { levels: number[] };      // length 5: [normal, skill, circuit, intro, lib] (card.py order)
  sequences?: { sequence: number };  // 0–6
  echo1?: EchoOCRData;
  echo2?: EchoOCRData;
  echo3?: EchoOCRData;
  echo4?: EchoOCRData;
  echo5?: EchoOCRData;
}
