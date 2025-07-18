import type { ViewMode, Theme, EditorOptions, TreeNode, ParseResult } from '../types';
import { parseJson, validateJson } from '../utils/json-parser';
import { generateTree } from '../utils/tree-generator';

// JSON 텍스트 상태
export let jsonText = $state('');

// 파싱된 결과
export let parseResult = $derived<ParseResult>(() => {
  if (!jsonText.trim()) {
    return {
      data: null,
      isValid: false,
      errors: []
    };
  }
  return parseJson(jsonText);
});

// 트리 데이터
export let treeData = $derived<TreeNode[]>(() => {
  if (parseResult.isValid && parseResult.data !== null) {
    return generateTree(parseResult.data);
  }
  return [];
});

// UI 상태
export let viewMode = $state<ViewMode>('text');
export let isDarkMode = $state(false);
export let isAutoUpdate = $state(true);
export let isLoading = $state(false);

// 에디터 옵션
export let editorOptions = $state<EditorOptions>({
  theme: 'light',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  lineNumbers: true,
  autoFormat: false,
  autoValidate: true
});

// 검색 상태
export let searchQuery = $state('');
export let searchResults = $state<TreeNode[]>([]);

// 파일 정보
export let currentFileName = $state<string>('');
export let fileSize = $derived(() => {
  return new Blob([jsonText]).size;
});

// 통계 정보
export let stats = $derived(() => {
  if (!parseResult.isValid) {
    return {
      characters: jsonText.length,
      lines: jsonText.split('\n').length,
      size: fileSize,
      isValid: false
    };
  }

  const data = parseResult.data;
  let objectCount = 0;
  let arrayCount = 0;
  let stringCount = 0;
  let numberCount = 0;
  let booleanCount = 0;
  let nullCount = 0;

  function countTypes(obj: any): void {
    if (obj === null) {
      nullCount++;
    } else if (Array.isArray(obj)) {
      arrayCount++;
      obj.forEach(countTypes);
    } else if (typeof obj === 'object') {
      objectCount++;
      Object.values(obj).forEach(countTypes);
    } else if (typeof obj === 'string') {
      stringCount++;
    } else if (typeof obj === 'number') {
      numberCount++;
    } else if (typeof obj === 'boolean') {
      booleanCount++;
    }
  }

  if (data !== null) {
    countTypes(data);
  }

  return {
    characters: jsonText.length,
    lines: jsonText.split('\n').length,
    size: fileSize,
    isValid: true,
    types: {
      objects: objectCount,
      arrays: arrayCount,
      strings: stringCount,
      numbers: numberCount,
      booleans: booleanCount,
      nulls: nullCount
    }
  };
});

// 히스토리 관리
export let history = $state<string[]>([]);
export let historyIndex = $state(-1);

// 액션 함수들
export function updateJsonText(text: string) {
  jsonText = text;
  
  // 히스토리 추가 (최대 50개)
  if (text !== history[history.length - 1]) {
    history.push(text);
    if (history.length > 50) {
      history.shift();
    }
    historyIndex = history.length - 1;
  }
}

export function setViewMode(mode: ViewMode) {
  viewMode = mode;
}

export function toggleDarkMode() {
  isDarkMode = !isDarkMode;
  editorOptions.theme = isDarkMode ? 'dark' : 'light';
}

export function updateEditorOptions(options: Partial<EditorOptions>) {
  editorOptions = { ...editorOptions, ...options };
}

export function formatCurrentJson() {
  if (parseResult.isValid) {
    try {
      const formatted = JSON.stringify(parseResult.data, null, editorOptions.tabSize);
      updateJsonText(formatted);
    } catch (error) {
      console.error('포맷팅 중 오류:', error);
    }
  }
}

export function minifyCurrentJson() {
  if (parseResult.isValid) {
    try {
      const minified = JSON.stringify(parseResult.data);
      updateJsonText(minified);
    } catch (error) {
      console.error('압축 중 오류:', error);
    }
  }
}

export function clearJson() {
  updateJsonText('');
  currentFileName = '';
}

export function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    jsonText = history[historyIndex];
  }
}

export function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    jsonText = history[historyIndex];
  }
}

export function canUndo() {
  return historyIndex > 0;
}

export function canRedo() {
  return historyIndex < history.length - 1;
}

// 로컬 스토리지에서 설정 불러오기
export function loadSettings() {
  try {
    const savedSettings = localStorage.getItem('json-parser-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      isDarkMode = settings.isDarkMode || false;
      isAutoUpdate = settings.isAutoUpdate ?? true;
      editorOptions = { ...editorOptions, ...settings.editorOptions };
    }
  } catch (error) {
    console.error('설정 불러오기 오류:', error);
  }
}

// 로컬 스토리지에 설정 저장
export function saveSettings() {
  try {
    const settings = {
      isDarkMode,
      isAutoUpdate,
      editorOptions
    };
    localStorage.setItem('json-parser-settings', JSON.stringify(settings));
  } catch (error) {
    console.error('설정 저장 오류:', error);
  }
}

// 자동 저장 이펙트
$effect(() => {
  if (jsonText) {
    try {
      localStorage.setItem('json-parser-last-content', jsonText);
    } catch (error) {
      console.error('자동 저장 오류:', error);
    }
  }
});

// 설정 자동 저장 이펙트
$effect(() => {
  saveSettings();
}); 