
export type VoiceMode = 'male' | 'female';
export type AppMode = 'chat' | 'voice' | 'both';

export interface Language {
  code: string;
  name: string;
  nativeName: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'news' | 'file';
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  timestamp: number;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'ur-PK', name: 'Urdu', nativeName: 'اردو' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
  { code: 'bn-BD', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'zh-CN', name: 'Chinese', nativeName: '中文' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'tr-TR', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'id-ID', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'pt-BR', name: 'Portuguese', nativeName: 'Português' },
  { code: 'it-IT', name: 'Italian', nativeName: 'Italiano' },
];
