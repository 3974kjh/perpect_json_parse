# 에러 핸들링 가이드라인

## 1. 에러 분류 체계

### 1.1 JSON 파싱 에러
```typescript
enum JsonErrorType {
  SYNTAX_ERROR = 'SYNTAX_ERROR',           // 구문 오류
  INVALID_CHARACTER = 'INVALID_CHARACTER', // 잘못된 문자
  UNEXPECTED_TOKEN = 'UNEXPECTED_TOKEN',   // 예상치 못한 토큰
  UNCLOSED_STRING = 'UNCLOSED_STRING',     // 닫히지 않은 문자열
  TRAILING_COMMA = 'TRAILING_COMMA',       // 후행 쉼표
  DUPLICATE_KEY = 'DUPLICATE_KEY',         // 중복 키
  INVALID_ESCAPE = 'INVALID_ESCAPE',       // 잘못된 이스케이프
  INVALID_NUMBER = 'INVALID_NUMBER',       // 잘못된 숫자
  INVALID_UNICODE = 'INVALID_UNICODE'      // 잘못된 유니코드
}
```

### 1.2 시스템 에러
```typescript
enum SystemErrorType {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',       // 파일 크기 초과
  NETWORK_ERROR = 'NETWORK_ERROR',         // 네트워크 오류
  STORAGE_ERROR = 'STORAGE_ERROR',         // 저장소 오류
  MEMORY_ERROR = 'MEMORY_ERROR',           // 메모리 부족
  BROWSER_INCOMPATIBLE = 'BROWSER_INCOMPATIBLE' // 브라우저 호환성
}
```

## 2. 에러 클래스 정의

### 2.1 기본 에러 클래스
```typescript
abstract class BaseError extends Error {
  abstract readonly type: string;
  abstract readonly code: string;
  
  constructor(
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      type: this.type,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    };
  }
}
```

### 2.2 JSON 파싱 에러
```typescript
class JsonParseError extends BaseError {
  readonly type = 'JSON_PARSE_ERROR';
  
  constructor(
    message: string,
    public readonly code: JsonErrorType,
    public readonly position?: {
      line: number;
      column: number;
      index: number;
    },
    public readonly suggestion?: string,
    details?: Record<string, any>
  ) {
    super(message, details);
  }

  get location(): string {
    if (!this.position) return '';
    return `Line ${this.position.line}, Column ${this.position.column}`;
  }
}
```

### 2.3 검증 에러
```typescript
class JsonValidationError extends BaseError {
  readonly type = 'JSON_VALIDATION_ERROR';
  
  constructor(
    message: string,
    public readonly code: string,
    public readonly path: string,
    public readonly expectedType?: string,
    public readonly actualType?: string
  ) {
    super(message);
  }
}
```

### 2.4 시스템 에러
```typescript
class SystemError extends BaseError {
  readonly type = 'SYSTEM_ERROR';
  
  constructor(
    message: string,
    public readonly code: SystemErrorType,
    public readonly recoverable: boolean = true,
    details?: Record<string, any>
  ) {
    super(message, details);
  }
}
```

## 3. 에러 검출 및 분석

### 3.1 JSON 파싱 에러 분석
```typescript
class JsonErrorAnalyzer {
  static analyzeParseError(text: string, error: Error): JsonParseError {
    const message = error.message;
    const position = this.extractPosition(message, text);
    
    // 일반적인 에러 패턴 매칭
    if (message.includes('Unexpected token')) {
      return this.handleUnexpectedToken(text, position, message);
    }
    
    if (message.includes('Unterminated string')) {
      return this.handleUnterminatedString(text, position);
    }
    
    if (message.includes('Trailing comma')) {
      return this.handleTrailingComma(text, position);
    }
    
    // 기본 에러 반환
    return new JsonParseError(
      this.translateErrorMessage(message),
      JsonErrorType.SYNTAX_ERROR,
      position
    );
  }

  private static extractPosition(message: string, text: string) {
    // 에러 메시지에서 위치 정보 추출
    const positionMatch = message.match(/at position (\d+)/);
    if (positionMatch) {
      const index = parseInt(positionMatch[1]);
      return this.indexToLineColumn(text, index);
    }
    return null;
  }

  private static indexToLineColumn(text: string, index: number) {
    const lines = text.substring(0, index).split('\n');
    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
      index
    };
  }

  private static handleUnexpectedToken(
    text: string, 
    position: any, 
    message: string
  ): JsonParseError {
    // 예상치 못한 토큰 분석
    const tokenMatch = message.match(/Unexpected token (.+)/);
    const token = tokenMatch ? tokenMatch[1] : 'unknown';
    
    let suggestion = '';
    
    if (token === '}') {
      suggestion = '객체나 배열이 올바르게 닫혔는지 확인해주세요.';
    } else if (token === ',') {
      suggestion = '마지막 요소 다음에 불필요한 쉼표가 있는지 확인해주세요.';
    } else if (token.includes('"')) {
      suggestion = '문자열이 올바르게 닫혔는지 확인해주세요.';
    }
    
    return new JsonParseError(
      `예상치 못한 토큰 '${token}'이 발견되었습니다.`,
      JsonErrorType.UNEXPECTED_TOKEN,
      position,
      suggestion
    );
  }

  private static handleTrailingComma(text: string, position: any): JsonParseError {
    return new JsonParseError(
      '마지막 요소 뒤에 불필요한 쉼표가 있습니다.',
      JsonErrorType.TRAILING_COMMA,
      position,
      '마지막 쉼표를 제거해주세요.'
    );
  }
}
```

### 3.2 자동 수정 제안
```typescript
class JsonAutoFixer {
  static suggestFix(error: JsonParseError, text: string): string | null {
    switch (error.code) {
      case JsonErrorType.TRAILING_COMMA:
        return this.fixTrailingComma(text);
      
      case JsonErrorType.UNCLOSED_STRING:
        return this.fixUnclosedString(text, error.position);
      
      case JsonErrorType.DUPLICATE_KEY:
        return this.fixDuplicateKey(text);
      
      default:
        return null;
    }
  }

  private static fixTrailingComma(text: string): string {
    // 후행 쉼표 제거
    return text.replace(/,(\s*[}\]])/g, '$1');
  }

  private static fixUnclosedString(text: string, position?: any): string {
    if (!position) return text;
    
    // 닫히지 않은 문자열에 따옴표 추가
    const lines = text.split('\n');
    const line = lines[position.line - 1];
    const fixed = line.substring(0, position.column) + '"' + line.substring(position.column);
    lines[position.line - 1] = fixed;
    
    return lines.join('\n');
  }

  private static fixDuplicateKey(text: string): string {
    try {
      const obj = JSON.parse(text);
      // 중복 키 제거 로직
      return JSON.stringify(obj, null, 2);
    } catch {
      return text;
    }
  }
}
```

## 4. 에러 메시지 국제화

### 4.1 한국어 에러 메시지
```typescript
const ERROR_MESSAGES_KO = {
  [JsonErrorType.SYNTAX_ERROR]: '문법 오류가 발생했습니다.',
  [JsonErrorType.INVALID_CHARACTER]: '유효하지 않은 문자가 포함되어 있습니다.',
  [JsonErrorType.UNEXPECTED_TOKEN]: '예상치 못한 토큰이 발견되었습니다.',
  [JsonErrorType.UNCLOSED_STRING]: '문자열이 올바르게 닫히지 않았습니다.',
  [JsonErrorType.TRAILING_COMMA]: '마지막에 불필요한 쉼표가 있습니다.',
  [JsonErrorType.DUPLICATE_KEY]: '중복된 키가 발견되었습니다.',
  [JsonErrorType.INVALID_ESCAPE]: '잘못된 이스케이프 문자입니다.',
  [JsonErrorType.INVALID_NUMBER]: '유효하지 않은 숫자 형식입니다.',
  [JsonErrorType.INVALID_UNICODE]: '잘못된 유니코드 이스케이프입니다.'
} as const;
```

### 4.2 수정 제안 메시지
```typescript
const SUGGESTION_MESSAGES_KO = {
  [JsonErrorType.TRAILING_COMMA]: [
    '마지막 요소 뒤의 쉼표를 제거하세요.',
    '객체나 배열의 마지막 항목 다음에는 쉼표를 사용하지 않습니다.'
  ],
  [JsonErrorType.UNCLOSED_STRING]: [
    '문자열의 끝에 따옴표(")를 추가하세요.',
    '문자열 내부의 따옴표는 백슬래시로 이스케이프하세요: \\"'
  ],
  [JsonErrorType.DUPLICATE_KEY]: [
    '객체 내에서 같은 키를 두 번 사용할 수 없습니다.',
    '중복된 키 중 하나를 제거하거나 다른 이름으로 변경하세요.'
  ]
} as const;
```

## 5. 에러 표시 및 사용자 경험

### 5.1 에러 하이라이팅
```typescript
interface ErrorHighlight {
  startLine: number;
  endLine: number;
  startColumn: number;
  endColumn: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  quickFix?: string;
}

class ErrorHighlighter {
  static createHighlight(error: JsonParseError, text: string): ErrorHighlight {
    const position = error.position;
    if (!position) {
      return this.createGenericHighlight(error);
    }

    return {
      startLine: position.line,
      endLine: position.line,
      startColumn: position.column,
      endColumn: position.column + 1,
      severity: 'error',
      message: error.message,
      quickFix: error.suggestion
    };
  }
}
```

### 5.2 에러 복구 전략
```typescript
class ErrorRecovery {
  static attemptRecovery(text: string): string[] {
    const strategies = [
      this.addMissingBrackets,
      this.fixCommonQuotes,
      this.removeTrailingCommas,
      this.fixDuplicateKeys
    ];

    const results: string[] = [];
    
    for (const strategy of strategies) {
      try {
        const fixed = strategy(text);
        JSON.parse(fixed); // 검증
        results.push(fixed);
      } catch {
        // 복구 실패, 다음 전략 시도
      }
    }

    return results;
  }

  private static addMissingBrackets(text: string): string {
    // 누락된 괄호 추가 로직
    let fixed = text.trim();
    
    // 객체 괄호 검사
    const openBraces = (fixed.match(/{/g) || []).length;
    const closeBraces = (fixed.match(/}/g) || []).length;
    
    if (openBraces > closeBraces) {
      fixed += '}' * (openBraces - closeBraces);
    }
    
    return fixed;
  }
}
```

## 6. 로깅 및 모니터링

### 6.1 에러 로깅
```typescript
class ErrorLogger {
  static logError(error: BaseError, context?: Record<string, any>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: error.type,
      code: error.code,
      message: error.message,
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 로컬 스토리지에 저장 (개발환경)
    if (import.meta.env.DEV) {
      this.saveToLocalStorage(logEntry);
    }

    // 콘솔 출력
    console.error('Error logged:', logEntry);
  }

  private static saveToLocalStorage(logEntry: any) {
    try {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.push(logEntry);
      
      // 최대 100개 로그만 유지
      if (logs.length > 100) {
        logs.shift();
      }
      
      localStorage.setItem('error_logs', JSON.stringify(logs));
    } catch (error) {
      console.warn('Failed to save error log:', error);
    }
  }
}
```

### 6.2 에러 통계
```typescript
class ErrorAnalytics {
  private static errorCounts = new Map<string, number>();

  static trackError(error: BaseError) {
    const key = `${error.type}:${error.code}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
  }

  static getMostCommonErrors(limit: number = 10) {
    return Array.from(this.errorCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit);
  }

  static getErrorReport() {
    return {
      totalErrors: Array.from(this.errorCounts.values())
        .reduce((sum, count) => sum + count, 0),
      uniqueErrors: this.errorCounts.size,
      topErrors: this.getMostCommonErrors()
    };
  }
}
```

## 7. 사용자 친화적 에러 메시지

### 7.1 단계별 안내
```typescript
const createUserFriendlyError = (error: JsonParseError): UserFriendlyError => {
  return {
    title: getErrorTitle(error.code),
    description: error.message,
    steps: getFixSteps(error.code),
    example: getFixExample(error.code),
    learnMore: getLearnMoreLink(error.code)
  };
};

const getFixSteps = (errorCode: JsonErrorType): string[] => {
  switch (errorCode) {
    case JsonErrorType.TRAILING_COMMA:
      return [
        '1. 오류가 발생한 위치를 확인하세요',
        '2. 마지막 요소 뒤의 쉼표를 찾으세요',
        '3. 불필요한 쉼표를 제거하세요'
      ];
    
    case JsonErrorType.UNCLOSED_STRING:
      return [
        '1. 문자열이 시작된 위치를 찾으세요',
        '2. 문자열이 끝나는 위치에 닫는 따옴표가 있는지 확인하세요',
        '3. 누락된 따옴표를 추가하세요'
      ];
    
    default:
      return ['JSON 문법을 확인하고 수정해주세요'];
  }
};
```

### 7.2 예시 제공
```typescript
const getFixExample = (errorCode: JsonErrorType): { before: string; after: string } => {
  switch (errorCode) {
    case JsonErrorType.TRAILING_COMMA:
      return {
        before: '{\n  "name": "test",\n  "value": 123,\n}',
        after: '{\n  "name": "test",\n  "value": 123\n}'
      };
    
    case JsonErrorType.UNCLOSED_STRING:
      return {
        before: '{\n  "name": "test\n}',
        after: '{\n  "name": "test"\n}'
      };
    
    default:
      return {
        before: '',
        after: ''
      };
  }
};
``` 