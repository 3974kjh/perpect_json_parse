// JSON 파싱 관련 타입
export interface ParseResult {
  data: unknown;
  isValid: boolean;
  errors: JsonParseError[];
}

export interface JsonParseError {
  type: string;
  code: string;
  message: string;
  line?: number;
  column?: number;
  index?: number;
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: JsonParseError[];
}

// 트리 뷰 관련 타입
export interface TreeNode {
  id: string;
  key: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  path: string;
  children: TreeNode[];
  expanded: boolean;
  depth: number;
}

// UI 관련 타입
export type ViewMode = 'text' | 'tree' | 'graph';
export type Theme = 'light' | 'dark' | 'auto';

export interface EditorOptions {
  theme: Theme;
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoFormat: boolean;
  autoValidate: boolean;
}

// 포맷팅 옵션
export interface FormatOptions {
  indent: number;
  sortKeys: boolean;
  preserveOrder: boolean;
}

// 파일 관리
export interface FileInfo {
  name: string;
  size: number;
  type: string;
  lastModified: Date;
}

// 검색 옵션
export interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  scope: 'keys' | 'values' | 'both';
}

// 히스토리
export interface HistoryEntry {
  id: string;
  timestamp: Date;
  name: string;
  data: string;
  size: number;
}

// 사용자 설정
export interface UserSettings {
  theme: Theme;
  language: 'ko' | 'en';
  autoSave: boolean;
  autoFormat: boolean;
  validationMode: 'realtime' | 'ondemand';
  maxFileSize: number;
} 