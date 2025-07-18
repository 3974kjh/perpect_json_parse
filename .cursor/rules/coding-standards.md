# 코딩 표준 및 컨벤션

## TypeScript 코딩 표준

### 1. 네이밍 컨벤션

#### 변수 및 함수
```typescript
// ✅ camelCase 사용
const jsonData = '';
const isValidJson = true;
const parseJsonData = () => {};

// ❌ 지양할 패턴
const json_data = '';
const JsonData = '';
```

#### 상수
```typescript
// ✅ SCREAMING_SNAKE_CASE
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_INDENT_SIZE = 2;
const ERROR_MESSAGES = {
  INVALID_JSON: '유효하지 않은 JSON 형식입니다',
  FILE_TOO_LARGE: '파일 크기가 너무 큽니다'
} as const;
```

#### 타입 및 인터페이스
```typescript
// ✅ PascalCase 사용
interface JsonParseResult {
  data: unknown;
  errors: ParseError[];
  isValid: boolean;
}

type ViewMode = 'text' | 'tree' | 'graph';

// ✅ 제네릭은 단일 대문자
interface ApiResponse<T> {
  data: T;
  status: number;
}
```

### 2. 파일 및 폴더 네이밍

#### 컴포넌트 파일
```
// ✅ PascalCase.svelte
JsonEditor.svelte
TreeView.svelte
ErrorMessage.svelte

// ✅ 유틸리티는 kebab-case
json-parser.ts
error-analyzer.ts
file-utils.ts
```

#### 폴더 구조
```
src/
├── lib/
│   ├── components/
│   │   ├── json/          # JSON 관련 컴포넌트
│   │   ├── ui/            # 기본 UI 컴포넌트
│   │   └── layout/        # 레이아웃 컴포넌트
│   ├── stores/           # 상태 관리
│   ├── utils/            # 유틸리티 함수
│   └── types/            # 타입 정의
```

### 3. 코드 스타일

#### 들여쓰기 및 형식
```typescript
// ✅ 2 spaces 들여쓰기
const config = {
  indent: 2,
  semicolons: true,
  quotes: 'single'
};

// ✅ 트레일링 콤마 사용
const themes = [
  'light',
  'dark',
  'auto', // 트레일링 콤마
];
```

#### 함수 정의
```typescript
// ✅ 함수 표현식 선호
const parseJson = (text: string): ParseResult => {
  try {
    const data = JSON.parse(text);
    return { data, isValid: true, errors: [] };
  } catch (error) {
    return { 
      data: null, 
      isValid: false, 
      errors: [parseError(error)] 
    };
  }
};

// ✅ 복잡한 함수는 타입 먼저 정의
type JsonValidator = (text: string) => ValidationResult;

const validateJson: JsonValidator = (text) => {
  // 구현
};
```

### 4. Svelte 5 Runes 패턴

#### 상태 정의
```typescript
// ✅ Runes 사용
let jsonText = $state('');
let parsedData = $derived(parseJson(jsonText));
let validationErrors = $derived(validateJson(jsonText));

// ✅ 복잡한 상태는 객체로 그룹화
let editorState = $state({
  text: '',
  cursorPosition: 0,
  selections: []
});
```

#### 이펙트 및 액션
```typescript
// ✅ 사이드 이펙트는 $effect 사용
$effect(() => {
  if (isAutoSave && jsonText) {
    saveToLocalStorage(jsonText);
  }
});

// ✅ 클린업이 필요한 경우
$effect(() => {
  const timer = setTimeout(() => {
    validateJsonDebounced(jsonText);
  }, 300);
  
  return () => clearTimeout(timer);
});
```

### 5. 에러 처리

#### 에러 타입 정의
```typescript
// ✅ 명확한 에러 타입
class JsonParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number,
    public code: string
  ) {
    super(message);
    this.name = 'JsonParseError';
  }
}

// ✅ Result 패턴 사용
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

const parseJsonSafe = (text: string): Result<unknown, JsonParseError> => {
  try {
    const data = JSON.parse(text);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: new JsonParseError(
        error.message, 
        getErrorLine(error), 
        getErrorColumn(error),
        'PARSE_ERROR'
      )
    };
  }
};
```

### 6. 유틸리티 함수

#### 순수 함수 선호
```typescript
// ✅ 순수 함수
const formatJson = (
  data: unknown, 
  options: FormatOptions = {}
): string => {
  const { indent = 2, sortKeys = false } = options;
  return JSON.stringify(
    data, 
    sortKeys ? Object.keys(data).sort() : null, 
    indent
  );
};

// ✅ 커링 패턴
const createValidator = (schema: JsonSchema) => 
  (data: unknown): ValidationResult => {
    // 검증 로직
  };
```

#### 타입 가드
```typescript
// ✅ 타입 가드 함수
const isJsonObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isJsonArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};
```

### 7. 컴포넌트 패턴

#### Props 인터페이스
```typescript
// ✅ Props 타입 명시적 정의
interface JsonEditorProps {
  value: string;
  readonly?: boolean;
  theme?: 'light' | 'dark';
  onchange?: (value: string) => void;
  onerror?: (error: JsonParseError) => void;
}

// ✅ 컴포넌트에서 사용
let { 
  value = '', 
  readonly = false, 
  theme = 'light',
  onchange,
  onerror 
}: JsonEditorProps = $props();
```

#### 이벤트 처리
```typescript
// ✅ 이벤트 핸들러
const handleTextChange = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  onchange?.(target.value);
};

// ✅ 커스텀 이벤트
const createJsonChangeEvent = (value: string) => 
  new CustomEvent('jsonchange', { 
    detail: { value }
  });
```

### 8. 성능 최적화

#### 메모이제이션
```typescript
// ✅ 비싼 계산은 메모이제이션
const memoizedParser = (() => {
  const cache = new Map<string, ParseResult>();
  
  return (text: string): ParseResult => {
    if (cache.has(text)) {
      return cache.get(text)!;
    }
    
    const result = parseJson(text);
    cache.set(text, result);
    return result;
  };
})();
```

#### 디바운싱
```typescript
// ✅ 디바운싱 유틸리티
const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};
```

### 9. 테스팅 패턴

#### 단위 테스트
```typescript
// ✅ 테스트 구조
describe('JsonParser', () => {
  describe('parseJson', () => {
    it('should parse valid JSON', () => {
      const result = parseJson('{"name": "test"}');
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({ name: 'test' });
    });

    it('should handle invalid JSON', () => {
      const result = parseJson('{"name": }');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });
});
```

### 10. 주석 및 문서화

#### JSDoc 스타일
```typescript
/**
 * JSON 텍스트를 파싱하고 검증 결과를 반환합니다.
 * 
 * @param text - 파싱할 JSON 문자열
 * @param options - 파싱 옵션
 * @returns 파싱 결과와 검증 정보
 * 
 * @example
 * ```typescript
 * const result = parseJson('{"name": "test"}');
 * if (result.isValid) {
 *   console.log(result.data);
 * }
 * ```
 */
const parseJson = (
  text: string, 
  options: ParseOptions = {}
): ParseResult => {
  // 구현
};
```

#### 코드 내 주석
```typescript
// ✅ 왜 이렇게 했는지 설명
// JSON.parse는 trailing comma를 허용하지 않으므로 
// 사전에 제거해야 함
const cleanedText = removeTrailingCommas(text);

// ✅ 복잡한 로직 설명
// Unicode escape sequence를 처리하기 위해
// 정규식으로 먼저 변환
const processedText = text.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
  return String.fromCharCode(parseInt(match.slice(2), 16));
});
``` 