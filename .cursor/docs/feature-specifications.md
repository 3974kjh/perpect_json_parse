# 기능 명세서

## 1. JSON Parse 오류 검증 및 디버깅 (핵심 기능)

### 1.1 오류 검출
- **실시간 검증**: 사용자가 입력하는 동안 실시간으로 JSON 구문 검증
- **정확한 위치 표시**: 오류가 발생한 정확한 라인과 컬럼 번호 표시
- **오류 원인 분석**: 구문 오류의 원인을 분석하여 사용자에게 제공

### 1.2 오류 메시지
```typescript
interface ErrorMessage {
  line: number;           // 오류 발생 라인
  column: number;         // 오류 발생 컬럼
  message: string;        // 한국어 오류 메시지
  type: 'syntax' | 'format' | 'structure';
  suggestions: string[];  // 수정 제안사항
  code: string;          // 오류 코드
}
```

### 1.3 수정 제안
- **자동 수정**: 간단한 오류는 자동 수정 버튼 제공
- **수정 힌트**: 쉼표 누락, 따옴표 불일치 등 일반적 오류 해결 방법 제시
- **예시 제공**: 올바른 JSON 형식 예시 표시

## 2. 계층화된 JSON 구조 시각화 (핵심 기능)

### 2.1 Tree View
```typescript
interface TreeNode {
  id: string;
  key: string;
  value: any;
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  path: string;           // JSON Path (예: $.users[0].name)
  children: TreeNode[];
  expanded: boolean;
  depth: number;
}
```

### 2.2 Graph View
- **플로우차트 형태**: 노드와 엣지로 JSON 구조 시각화
- **상호작용**: 노드 클릭으로 상세 정보 확인
- **줌/팬**: 확대/축소 및 드래그로 이동
- **레이아웃 옵션**: 세로형, 가로형, 방사형 레이아웃

### 2.3 시각화 기능
- **타입별 색상**: 데이터 타입에 따른 색상 구분
- **확장/축소**: 개별 노드 또는 전체 확장/축소
- **경로 표시**: 선택된 노드의 JSON Path 표시
- **통계 정보**: 총 노드 수, 깊이, 데이터 타입 분포

## 3. JSON 편집 및 포맷팅

### 3.1 코드 에디터
```typescript
interface EditorOptions {
  theme: 'light' | 'dark';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
}
```

### 3.2 포맷팅 옵션
- **들여쓰기**: 2/4/8 spaces, tab
- **정렬**: 키 정렬 옵션
- **압축**: Minify/Beautify 전환
- **실시간 포맷팅**: 자동 포맷팅 모드

### 3.3 구문 하이라이팅
- **타입별 색상**: 문자열, 숫자, 불린, null 등
- **오류 하이라이팅**: 구문 오류 부분 빨간색 표시
- **매칭 브래킷**: 대응되는 괄호 하이라이팅

## 4. 데이터 변환

### 4.1 지원 형식
```typescript
interface Converter {
  toXML(json: object): string;
  toCSV(json: object): string;
  toYAML(json: object): string;
  toTSV(json: object): string;
  toHTML(json: object): string;
}
```

### 4.2 변환 옵션
- **XML**: 루트 엘리먼트 설정, 속성 vs 엘리먼트 선택
- **CSV**: 헤더 포함/제외, 구분자 선택, 중첩 객체 처리
- **YAML**: 들여쓰기 설정, 인용부호 스타일

## 5. 고급 기능

### 5.1 JWT 디코더
```typescript
interface JWTDecoder {
  decode(token: string): {
    header: object;
    payload: object;
    signature: string;
    isValid: boolean;
    expiry: Date | null;
  };
}
```

### 5.2 JSON Schema 검증
- **스키마 업로드**: JSON Schema 파일 업로드
- **검증 결과**: 스키마 위반 사항 상세 표시
- **스키마 생성**: JSON 데이터로부터 스키마 자동 생성

### 5.3 검색 기능
```typescript
interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
  scope: 'keys' | 'values' | 'both';
}
```

## 6. 파일 관리

### 6.1 파일 입출력
- **지원 형식**: .json, .txt
- **드래그 앤 드롭**: 파일을 드래그하여 업로드
- **URL 로드**: URL에서 JSON 데이터 가져오기
- **다운로드**: 편집된 JSON 파일 다운로드

### 6.2 히스토리 관리
```typescript
interface History {
  id: string;
  timestamp: Date;
  name: string;
  data: string;
  size: number;
}
```

### 6.3 즐겨찾기
- **저장**: 자주 사용하는 JSON 저장
- **태그**: 카테고리별 분류
- **공유**: 링크로 공유 기능

## 7. 사용자 설정

### 7.1 환경 설정
```typescript
interface UserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'ko' | 'en';
  autoSave: boolean;
  autoFormat: boolean;
  validationMode: 'realtime' | 'ondemand';
  maxFileSize: number;
}
```

### 7.2 단축키
```typescript
const shortcuts = {
  'Ctrl+S': 'saveFile',
  'Ctrl+O': 'openFile',
  'Ctrl+F': 'search',
  'Ctrl+D': 'format',
  'Ctrl+M': 'minify',
  'F11': 'fullscreen',
  'Esc': 'closeModal'
};
```

## 8. 성능 및 제한사항

### 8.1 파일 크기 제한
- **기본**: 5MB
- **대용량 모드**: 50MB (성능 경고와 함께)
- **스트리밍**: 100MB+ (청크 단위 처리)

### 8.2 성능 최적화
- **가상 스크롤링**: 대용량 데이터 표시
- **지연 로딩**: 트리 노드 동적 로딩
- **웹 워커**: 무거운 작업 백그라운드 처리
- **메모이제이션**: 파싱 결과 캐싱

## 9. 오류 처리

### 9.1 일반적인 JSON 오류
```typescript
const commonErrors = {
  'trailing_comma': '마지막 쉼표 제거 필요',
  'unquoted_key': '키를 따옴표로 감싸야 함',
  'single_quotes': '작은따옴표를 큰따옴표로 변경',
  'missing_bracket': '닫는 괄호 누락',
  'duplicate_key': '중복된 키 발견',
  'invalid_escape': '잘못된 이스케이프 문자',
  'unexpected_token': '예상치 못한 토큰'
};
```

### 9.2 복구 기능
- **자동 수정**: 일반적인 오류 자동 감지 및 수정
- **백업**: 오류 발생 전 상태로 복원
- **단계별 복구**: 오류 수정 과정을 단계별로 안내

## 10. 모바일 지원

### 10.1 터치 최적화
- **스와이프**: 탭 전환
- **핀치**: 줌 인/아웃
- **롱 프레스**: 컨텍스트 메뉴
- **탭**: 노드 선택/확장

### 10.2 반응형 레이아웃
- **모바일**: 세로 스택 레이아웃
- **태블릿**: 사이드바이사이드
- **데스크톱**: 멀티패널 