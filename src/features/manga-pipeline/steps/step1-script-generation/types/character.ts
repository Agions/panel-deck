export interface AssetReference {
  type: 'image' | 'audio' | 'video';
  url: string;
  description?: string;
}

export interface CharacterCard {
  id: string;
  name: string;
  appearance: string;
  personality: string;
  speakingStyle: string;
  voiceSuggestion: string;
  relationships: { name: string; type: string }[];
  firstAppearance: string;
  assetReferences: AssetReference[];
}
