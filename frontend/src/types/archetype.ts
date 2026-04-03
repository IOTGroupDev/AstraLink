export interface ArchetypeBlueprint {
  birthDate: string;
  sunSign: string;
  moonSign: string | null;
  ascendantSign: string | null;
  dominantElement: string;
  lifePathNumber: number;
  masterNumber: number | null;
}

export interface ArchetypeResult {
  source: 'natal' | 'date_only';
  generatedBy: 'algorithm';
  title: string;
  subtitle: string;
  essence: string;
  overview: string;
  strengths: string[];
  shadowPatterns: string[];
  relationships: string;
  work: string;
  growthTask: string;
  note: string;
  blueprint: ArchetypeBlueprint;
}
