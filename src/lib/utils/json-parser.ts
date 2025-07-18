import type { ParseResult, JsonParseError, ValidationResult } from '../types';

// ECMAScript 사양 기반 JSON 파싱 에러 타입
export enum JsonErrorType {
  SYNTAX_ERROR = 'SYNTAX_ERROR',
  UNEXPECTED_TOKEN = 'UNEXPECTED_TOKEN',
  UNEXPECTED_END = 'UNEXPECTED_END',
  UNTERMINATED_STRING = 'UNTERMINATED_STRING',
  INVALID_CHARACTER = 'INVALID_CHARACTER',
  INVALID_ESCAPE_SEQUENCE = 'INVALID_ESCAPE_SEQUENCE',
  INVALID_UNICODE_ESCAPE = 'INVALID_UNICODE_ESCAPE',
  INVALID_NUMBER = 'INVALID_NUMBER',
  TRAILING_COMMA = 'TRAILING_COMMA',
  DUPLICATE_KEY = 'DUPLICATE_KEY',
  INVALID_VALUE = 'INVALID_VALUE',
  NEWLINE_IN_STRING = 'NEWLINE_IN_STRING'
}

// ECMAScript 사양 기반 한국어 에러 메시지
const ERROR_MESSAGES_KO = {
  [JsonErrorType.SYNTAX_ERROR]: 'JSON 문법 오류입니다.',
  [JsonErrorType.UNEXPECTED_TOKEN]: '예상하지 못한 토큰입니다.',
  [JsonErrorType.UNEXPECTED_END]: '예상치 못하게 JSON이 끝났습니다.',
  [JsonErrorType.UNTERMINATED_STRING]: '문자열이 끝나지 않았습니다.',
  [JsonErrorType.INVALID_CHARACTER]: '유효하지 않은 문자입니다.',
  [JsonErrorType.INVALID_ESCAPE_SEQUENCE]: '잘못된 이스케이프 시퀀스입니다.',
  [JsonErrorType.INVALID_UNICODE_ESCAPE]: '잘못된 유니코드 이스케이프입니다.',
  [JsonErrorType.INVALID_NUMBER]: '유효하지 않은 숫자 형식입니다.',
  [JsonErrorType.TRAILING_COMMA]: '후행 쉼표가 있습니다.',
  [JsonErrorType.DUPLICATE_KEY]: '중복된 키가 있습니다.',
  [JsonErrorType.INVALID_VALUE]: '유효하지 않은 값입니다.',
  [JsonErrorType.NEWLINE_IN_STRING]: '문자열 내에 줄바꿈이 있습니다.'
} as const;

/**
 * 문자 인덱스를 라인과 컬럼으로 변환
 */
function indexToLineColumn(text: string, index: number) {
  const lines = text.substring(0, index).split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1,
    index
  };
}

/**
 * JSON 오류 분석기
 */
class JsonErrorAnalyzer {
  private text: string;
  private errors: JsonParseError[];
  private maxErrors: number = 15;
  private errorPositions: Set<number> = new Set();

  constructor(text: string) {
    this.text = text;
    this.errors = [];
    this.errorPositions = new Set();
  }

  analyze(): JsonParseError[] {
    this.errors = [];
    this.errorPositions.clear();

    // 1. 패턴 기반 분석
    this.performPatternAnalysis();
    
    // 2. 쉼표 누락 분석
    this.performCommaAnalysis();
    
    // 3. JSON.parse() 오류 매핑
    this.performJsonParseErrorMapping();

    // 중복 제거 및 정렬
    return this.removeDuplicateAndSort();
  }

  /**
   * 패턴 기반 분석
   */
  private performPatternAnalysis(): void {
    const lines = this.text.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const trimmed = line.trim();
      
      if (!trimmed || this.isStructuralLine(trimmed)) continue;
      
      const lineStartPos = this.getLineStartPosition(lineIndex);
      
      if (trimmed.includes(':')) {
        this.analyzeKeyValueLine(line, lineStartPos, trimmed);
      } else {
        this.analyzeValueLine(line, lineStartPos, trimmed);
      }
    }
  }

  /**
   * 쉼표 누락 분석
   */
  private performCommaAnalysis(): void {
    const lines = this.text.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length - 1; lineIndex++) {
      const currentLine = lines[lineIndex].trim();
      const nextLine = lines[lineIndex + 1].trim();
      
      if (this.needsComma(currentLine, nextLine)) {
        const lineStartPos = this.getLineStartPosition(lineIndex);
        const position = indexToLineColumn(this.text, lineStartPos + lines[lineIndex].length - 1);
        this.addError(JsonErrorType.SYNTAX_ERROR, '쉼표(,)가 누락되었습니다.', position);
      }
    }
    
    // 객체/배열 끝 다음 쉼표 누락 감지
    this.detectMissingCommasAfterStructures();
  }

  /**
   * 객체나 배열 끝 다음 쉼표 누락 감지
   */
  private detectMissingCommasAfterStructures(): void {
    const lines = this.text.split('\n');
    
    for (let lineIndex = 0; lineIndex < lines.length - 1; lineIndex++) {
      const currentLine = lines[lineIndex].trim();
      const nextLine = lines[lineIndex + 1].trim();
      
      // 현재 라인이 객체나 배열의 끝이고, 다음 라인이 새로운 요소인 경우
      if (this.isStructureEnd(currentLine) && this.isNewElement(nextLine)) {
        // 쉼표가 없는지 확인
        if (!currentLine.endsWith(',')) {
          const lineStartPos = this.getLineStartPosition(lineIndex);
          const position = indexToLineColumn(this.text, lineStartPos + lines[lineIndex].length - 1);
          this.addError(JsonErrorType.SYNTAX_ERROR, '객체/배열 끝 다음에 쉼표(,)가 누락되었습니다.', position);
        }
      }
      
      // 멀티라인 객체/배열의 경우 더 정교한 검사
      if (this.isMultilineStructureEnd(currentLine) && this.isValueOrKeyLine(nextLine)) {
        if (!this.hasCommaAfterStructure(lines, lineIndex)) {
          const lineStartPos = this.getLineStartPosition(lineIndex);
          const position = indexToLineColumn(this.text, lineStartPos + lines[lineIndex].length - 1);
          this.addError(JsonErrorType.SYNTAX_ERROR, '객체/배열 다음에 쉼표(,)가 누락되었습니다.', position);
        }
      }
    }
  }

  /**
   * 현재 라인이 구조체(객체/배열)의 끝인지 확인
   */
  private isStructureEnd(line: string): boolean {
    return line === '}' || line === ']' || line.endsWith('}') || line.endsWith(']');
  }

  /**
   * 다음 라인이 새로운 요소(키-값 쌍이나 배열 요소)인지 확인
   */
  private isNewElement(line: string): boolean {
    if (!line || this.isStructuralLine(line)) return false;
    
    // 키-값 쌍인 경우 (따옴표로 시작하거나 식별자로 시작하면서 콜론이 있는 경우)
    if (line.includes(':')) {
      const keyPart = line.substring(0, line.indexOf(':')).trim();
      return keyPart.length > 0;
    }
    
    // 배열 요소인 경우 (따옴표로 시작하거나 숫자, 불린, null 등)
    return line.startsWith('"') || 
           /^[0-9.-]/.test(line) || 
           line.startsWith('true') || 
           line.startsWith('false') || 
           line.startsWith('null') ||
           line.startsWith('{') ||
           line.startsWith('[') ||
           /^[a-zA-Z가-힣]/.test(line);
  }

  /**
   * 멀티라인 구조체의 끝인지 확인
   */
  private isMultilineStructureEnd(line: string): boolean {
    return line === '}' || line === ']';
  }

  /**
   * 값이나 키 라인인지 확인
   */
  private isValueOrKeyLine(line: string): boolean {
    if (!line || this.isStructuralLine(line)) return false;
    
    // 키-값 쌍
    if (line.includes(':')) return true;
    
    // 배열 요소
    return line.startsWith('"') || 
           /^[0-9.-]/.test(line) || 
           line.startsWith('true') || 
           line.startsWith('false') || 
           line.startsWith('null') ||
           /^[a-zA-Z가-힣]/.test(line.replace(/[,\s]*$/, ''));
  }

  /**
   * 구조체 다음에 쉼표가 있는지 확인
   */
  private hasCommaAfterStructure(lines: string[], structureEndLineIndex: number): boolean {
    const structureLine = lines[structureEndLineIndex].trim();
    
    // 같은 라인에 쉼표가 있는 경우
    if (structureLine.endsWith(',')) {
      return true;
    }
    
    // 다음 몇 라인에서 쉼표만 있는 라인을 찾기
    for (let i = structureEndLineIndex + 1; i < Math.min(structureEndLineIndex + 3, lines.length); i++) {
      const nextLine = lines[i].trim();
      if (nextLine === ',') {
        return true;
      }
      if (nextLine && !this.isStructuralLine(nextLine)) {
        break; // 다른 내용이 나오면 중단
      }
    }
    
    return false;
  }

  /**
   * JSON.parse() 오류 매핑
   */
  private performJsonParseErrorMapping(): void {
    try {
      JSON.parse(this.text);
    } catch (error) {
      if (error instanceof SyntaxError) {
        const positionMatch = error.message.match(/position (\d+)/);
        if (positionMatch) {
          const position = parseInt(positionMatch[1]);
          const lineCol = indexToLineColumn(this.text, position);
          
          // 쉼표 누락 관련 오류 감지
          if (error.message.includes('Unexpected token') && 
              (error.message.includes('"') || error.message.includes('{'))) {
            const prevLineCol = this.findPreviousValueLineEnd(lineCol.line);
            if (prevLineCol) {
              this.addError(JsonErrorType.SYNTAX_ERROR, '이전 라인에서 쉼표(,)가 누락되었습니다.', prevLineCol);
              return;
            }
          }
          
          let errorType = JsonErrorType.SYNTAX_ERROR;
          let message = 'JSON 문법 오류입니다.';
          
          if (error.message.includes('Unexpected number')) {
            errorType = JsonErrorType.INVALID_NUMBER;
            message = '유효하지 않은 숫자 형식입니다.';
          }
          
          this.addError(errorType, `${message} (${error.message})`, lineCol);
        }
      }
    }
  }

  /**
   * 키-값 라인 분석
   */
  private analyzeKeyValueLine(line: string, lineStartPos: number, trimmed: string): void {
    const colonIndex = trimmed.indexOf(':');
    const keyPart = trimmed.substring(0, colonIndex).trim();
    const valuePart = trimmed.substring(colonIndex + 1).trim();
    
    // 키 분석
    this.analyzeKeyPart(keyPart, line, lineStartPos);
    
    // 값 분석
    this.analyzeValuePart(valuePart, line, lineStartPos, colonIndex);
  }

  /**
   * 키 부분 분석
   */
  private analyzeKeyPart(keyPart: string, line: string, lineStartPos: number): void {
    if (!keyPart) return;
    
    if (keyPart.startsWith('"') && keyPart.endsWith('"') && keyPart.length > 2) {
      return; // 정상
    }
    
    if (keyPart.startsWith('"') && !keyPart.endsWith('"')) {
      const quotePos = line.indexOf('"');
      const position = indexToLineColumn(this.text, lineStartPos + quotePos);
      this.addError(JsonErrorType.UNTERMINATED_STRING, '키의 문자열을 닫는 따옴표가 없습니다.', position);
      return;
    }
    
    if (!keyPart.startsWith('"') && keyPart.endsWith('"')) {
      const keyName = keyPart.slice(0, -1).trim();
      if (this.isValidIdentifier(keyName)) {
        const keyStart = line.indexOf(keyName);
        const position = indexToLineColumn(this.text, lineStartPos + keyStart);
        this.addError(JsonErrorType.UNEXPECTED_TOKEN, `키 "${keyName}"에 시작 따옴표가 없습니다.`, position);
        return;
      }
    }
    
    if (!keyPart.startsWith('"') && !keyPart.endsWith('"')) {
      if (this.isValidIdentifier(keyPart)) {
        const keyStart = line.indexOf(keyPart);
        const position = indexToLineColumn(this.text, lineStartPos + keyStart);
        this.addError(JsonErrorType.UNEXPECTED_TOKEN, `키 "${keyPart}"에 따옴표가 없습니다.`, position);
        return;
      }
    }
  }

  /**
   * 값 부분 분석
   */
  private analyzeValuePart(valuePart: string, line: string, lineStartPos: number, colonIndex: number): void {
    if (!valuePart) return;
    
    const cleanValue = valuePart.replace(/[,\s}\]]*$/, '').trim();
    if (!cleanValue) return;
    
    if (cleanValue.startsWith('{') || cleanValue.startsWith('[')) return;
    
    // 숫자 형식 검증
    if (this.looksLikeNumber(cleanValue) && !this.isValidJsonNumber(cleanValue)) {
      const valueStart = line.indexOf(cleanValue, colonIndex);
      if (valueStart !== -1) {
        const position = indexToLineColumn(this.text, lineStartPos + valueStart);
        this.addError(JsonErrorType.INVALID_NUMBER, `"${cleanValue}"는 유효하지 않은 숫자 형식입니다.`, position);
        return;
      }
    }
    
    if (this.isJsonLiteral(cleanValue)) return;
    
    if (cleanValue.startsWith('"') && cleanValue.endsWith('"') && cleanValue.length > 2) return;
    
    if (cleanValue.startsWith('"') && !cleanValue.endsWith('"')) {
      const valueStart = line.indexOf(cleanValue, colonIndex);
      if (valueStart !== -1) {
        const position = indexToLineColumn(this.text, lineStartPos + valueStart);
        this.addError(JsonErrorType.UNTERMINATED_STRING, '값의 문자열을 닫는 따옴표가 없습니다.', position);
        return;
      }
    }
    
    if (!cleanValue.startsWith('"') && cleanValue.endsWith('"')) {
      const actualValue = cleanValue.slice(0, -1).trim();
      if (this.isValidStringValue(actualValue)) {
        const valueStart = line.indexOf(actualValue, colonIndex);
        if (valueStart !== -1) {
          const position = indexToLineColumn(this.text, lineStartPos + valueStart);
          this.addError(JsonErrorType.UNEXPECTED_TOKEN, `값 "${actualValue}"에 시작 따옴표가 없습니다.`, position);
          return;
        }
      }
    }
    
    if (!cleanValue.startsWith('"') && !cleanValue.endsWith('"')) {
      if (this.isValidStringValue(cleanValue)) {
        const valueStart = line.indexOf(cleanValue, colonIndex);
        if (valueStart !== -1) {
          const position = indexToLineColumn(this.text, lineStartPos + valueStart);
          this.addError(JsonErrorType.UNEXPECTED_TOKEN, `값 "${cleanValue}"에 따옴표가 없습니다.`, position);
          return;
        }
      }
    }
  }

  /**
   * 값 라인 분석 (배열 요소 등)
   */
  private analyzeValueLine(line: string, lineStartPos: number, trimmed: string): void {
    const cleanElement = trimmed.replace(/[,\s]*$/, '').trim();
    if (!cleanElement || this.isJsonLiteral(cleanElement)) return;
    
    if (cleanElement.startsWith('"') && cleanElement.endsWith('"') && cleanElement.length > 2) return;
    
    if (cleanElement.startsWith('"') && !cleanElement.endsWith('"')) {
      const quotePos = line.indexOf('"');
      const position = indexToLineColumn(this.text, lineStartPos + quotePos);
      this.addError(JsonErrorType.UNTERMINATED_STRING, '배열 요소의 문자열을 닫는 따옴표가 없습니다.', position);
      return;
    }
    
    if (!cleanElement.startsWith('"') && cleanElement.endsWith('"')) {
      const actualElement = cleanElement.slice(0, -1).trim();
      if (this.isValidStringValue(actualElement)) {
        const elementStart = line.indexOf(actualElement);
        if (elementStart !== -1) {
          const position = indexToLineColumn(this.text, lineStartPos + elementStart);
          this.addError(JsonErrorType.UNEXPECTED_TOKEN, `배열 요소 "${actualElement}"에 시작 따옴표가 없습니다.`, position);
          return;
        }
      }
    }
    
    if (!cleanElement.startsWith('"') && !cleanElement.endsWith('"')) {
      if (this.isValidStringValue(cleanElement)) {
        const elementStart = line.indexOf(cleanElement);
        if (elementStart !== -1) {
          const position = indexToLineColumn(this.text, lineStartPos + elementStart);
          this.addError(JsonErrorType.UNEXPECTED_TOKEN, `배열 요소 "${cleanElement}"에 따옴표가 없습니다.`, position);
          return;
        }
      }
    }
  }

  // 유틸리티 메서드들
  private isStructuralLine(line: string): boolean {
    return line === '{' || line === '}' || line === '[' || line === ']' || line === ',' ||
           line.startsWith('//') || line.startsWith('/*');
  }

  private needsComma(currentLine: string, nextLine: string): boolean {
    if (!this.isValueLine(currentLine) || !this.isValueLine(nextLine)) return false;
    return !currentLine.endsWith(',') && !currentLine.endsWith('{') && !currentLine.endsWith('[');
  }

  private isValueLine(line: string): boolean {
    if (!line || this.isStructuralLine(line)) return false;
    return line.includes(':') || 
           /^".*"[,]?$/.test(line) || 
           /^[0-9.-]+[,]?$/.test(line) || 
           /^(true|false|null)[,]?$/.test(line) ||
           /^[a-zA-Z가-힣]/.test(line.replace(/[,\s]*$/, ''));
  }

  private isValidIdentifier(str: string): boolean {
    return /^[a-zA-Z_가-힣][a-zA-Z0-9_가-힣]*$/.test(str.trim());
  }

  private isValidStringValue(str: string): boolean {
    const trimmed = str.trim();
    return trimmed.length > 0 && /^[a-zA-Z_가-힣]/.test(trimmed);
  }

  private looksLikeNumber(str: string): boolean {
    return /^-?\d+(\.\d+)*([eE][+-]?\d+)?$/.test(str);
  }

  private isValidJsonNumber(str: string): boolean {
    return /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(str);
  }

  private isJsonLiteral(str: string): boolean {
    return str === 'true' || str === 'false' || str === 'null' || this.isValidJsonNumber(str);
  }

  private getLineStartPosition(lineIndex: number): number {
    let pos = 0;
    for (let i = 0; i < lineIndex; i++) {
      const newlinePos = this.text.indexOf('\n', pos);
      if (newlinePos === -1) break;
      pos = newlinePos + 1;
    }
    return pos;
  }

  private findPreviousValueLineEnd(currentLine: number): { line: number, column: number, index: number } | null {
    const lines = this.text.split('\n');
    
    for (let lineIndex = currentLine - 2; lineIndex >= 0; lineIndex--) {
      const line = lines[lineIndex];
      const trimmed = line.trim();
      
      if (this.isValueLine(trimmed)) {
        const lineStartPos = this.getLineStartPosition(lineIndex);
        const lineEndPos = lineStartPos + line.length - 1;
        return indexToLineColumn(this.text, lineEndPos);
      }
    }
    
    return null;
  }

  private addError(type: JsonErrorType, message: string, position?: { line: number, column: number, index: number }): void {
    const pos = position || { line: 1, column: 1, index: 0 };
    
    if (this.errorPositions.has(pos.index)) return;
    if (this.errors.length >= this.maxErrors) return;

    this.errors.push({
      type: 'JSON_PARSE_ERROR',
      code: type,
      message: `${ERROR_MESSAGES_KO[type]} ${message}`,
      line: pos.line,
      column: pos.column,
      index: pos.index,
      suggestion: this.getSuggestion(type)
    });

    this.errorPositions.add(pos.index);
  }

  private getSuggestion(type: JsonErrorType): string {
    const suggestions = {
      [JsonErrorType.SYNTAX_ERROR]: 'JSON 문법을 확인하세요.',
      [JsonErrorType.UNEXPECTED_TOKEN]: '토큰의 위치와 형식을 확인하세요.',
      [JsonErrorType.UNEXPECTED_END]: 'JSON이 완전히 작성되었는지 확인하세요.',
      [JsonErrorType.UNTERMINATED_STRING]: '문자열을 닫는 따옴표를 추가하세요.',
      [JsonErrorType.INVALID_CHARACTER]: '유효하지 않은 문자를 제거하세요.',
      [JsonErrorType.INVALID_ESCAPE_SEQUENCE]: '올바른 이스케이프 시퀀스를 사용하세요.',
      [JsonErrorType.INVALID_UNICODE_ESCAPE]: '유니코드 이스케이프는 \\uXXXX 형식이어야 합니다.',
      [JsonErrorType.INVALID_NUMBER]: 'ECMAScript 숫자 형식을 따르세요.',
      [JsonErrorType.TRAILING_COMMA]: '마지막 요소 뒤의 쉼표를 제거하세요.',
      [JsonErrorType.DUPLICATE_KEY]: '중복된 키를 제거하거나 이름을 변경하세요.',
      [JsonErrorType.INVALID_VALUE]: '유효한 JSON 값을 사용하세요.',
      [JsonErrorType.NEWLINE_IN_STRING]: '문자열 내의 줄바꿈을 \\n으로 이스케이프하세요.'
    };
    return suggestions[type];
  }

  private removeDuplicateAndSort(): JsonParseError[] {
    const uniqueErrors: JsonParseError[] = [];
    
    for (const error of this.errors) {
      const isDuplicate = uniqueErrors.some(existing => 
        existing.line === error.line && existing.index === error.index
      );
      
      if (!isDuplicate) {
        uniqueErrors.push(error);
      }
    }
    
    return uniqueErrors.sort((a, b) => {
      if (a.line !== b.line) return (a.line || 0) - (b.line || 0);
      return (a.column || 0) - (b.column || 0);
    });
  }
}

/**
 * JSON 텍스트 파싱
 */
export function parseJson(text: string): ParseResult {
  if (!text.trim()) {
    return {
      data: null,
      isValid: false,
      errors: [{
        type: 'JSON_PARSE_ERROR',
        code: JsonErrorType.UNEXPECTED_END,
        message: 'JSON 텍스트가 비어있습니다.',
        suggestion: '유효한 JSON 데이터를 입력해주세요.'
      }]
    };
  }

  try {
    const data = JSON.parse(text);
    return {
      data,
      isValid: true,
      errors: []
    };
  } catch (error) {
    const analyzer = new JsonErrorAnalyzer(text);
    const detailedErrors = analyzer.analyze();
    
    return {
      data: null,
      isValid: false,
      errors: detailedErrors.length > 0 ? detailedErrors : [{
        type: 'JSON_PARSE_ERROR',
        code: JsonErrorType.SYNTAX_ERROR,
        message: `JSON 파싱 오류: ${(error as Error).message}`,
        suggestion: 'JSON 문법을 확인해주세요.'
      }]
    };
  }
}

/**
 * JSON 검증
 */
export function validateJson(text: string): ValidationResult {
  const result = parseJson(text);
  return {
    isValid: result.isValid,
    errors: result.errors
  };
}

/**
 * JSON 포맷팅
 */
export function formatJson(text: string, indent: number = 2): string {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed, null, indent);
  } catch {
    throw new Error('유효하지 않은 JSON입니다. 먼저 오류를 수정해주세요.');
  }
}

/**
 * JSON 압축 (minify)
 */
export function minifyJson(text: string): string {
  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed);
  } catch {
    throw new Error('유효하지 않은 JSON입니다. 먼저 오류를 수정해주세요.');
  }
} 