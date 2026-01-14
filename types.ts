
export interface ProductInfo {
  name: string;
  description: string;
  creativeDirection: string;
  userImages?: string[]; // Changed to array of Base64 strings
}

export type AppMode = 'video' | 'image' | 'pdp';

export interface ProductHistoryItem {
  id: string;
  name: string;
  description: string;
  userImages?: string[]; // Changed to array
  timestamp: number;
  isPinned: boolean;
}

export interface SceneConcept {
  id: string;
  title: string;
  description: string; // 场景描述
  script: string;      // 口播脚本 / 广告文案
  storyboard: string;  // 动画分镜 / 图片列表 / 详情页切片
  visualPrompt: string;
  // Lineage Metadata
  productName: string;
  creativeDirection: string;
  createdAt: number;
  mode?: AppMode; // Added
}

export interface ImageHistoryItem {
  id: string;
  base64: string;
  prompt: string;
  // Lineage Metadata
  productName: string;
  creativeDirection: string;
  conceptTitle: string;
  conceptId: string;
  createdAt: number;
  mode?: AppMode; // Added
}

export interface VideoHistoryItem {
  id: string;
  uri: string;
  blobUrl: string;
  // Lineage Metadata
  productName: string;
  creativeDirection: string;
  conceptTitle: string;
  createdAt: number;
  mode?: AppMode; // Added
}

export type AssetType = 'concept' | 'image' | 'video';

export interface LibraryAsset {
  id: string;
  type: AssetType;
  content: any; // SceneConcept | string (image base64) | string (video url)
  timestamp: number;
  meta?: {
    title?: string;
    prompt?: string;
    // Categorization fields
    mode?: AppMode;
    productName?: string;
    conceptTitle?: string;
  };
}

export enum AppStep {
  INPUT = 0,
  IDEATION = 1,
  VISUALIZATION = 2,
  PRODUCTION = 3,
}

export interface AppConfig {
  textModel: string;
  textKey: string;
  imageModel: string;
  imageKey: string;
  videoModel: string;
  videoKey: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  textModel: 'gemini-3-flash-preview',
  textKey: '',
  imageModel: 'gemini-2.5-flash-image', 
  imageKey: '',
  videoModel: 'veo-3.1-fast-generate-preview',
  videoKey: '',
};