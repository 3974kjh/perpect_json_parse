# 기술 사양

## 개발 환경
- **Frontend Framework**: Svelte 5 with Runes
- **Language**: TypeScript
- **Bundler**: Vite
- **CSS Framework**: TailwindCSS
- **UI Components**: Custom components + Lucide icons
- **State Management**: Svelte 5 Runes
- **Storage**: localStorage

## 주요 라이브러리

### 핵심 기능
```json
{
  "json-to-ast": "JSON AST 파싱",
  "json-schema": "JSON 스키마 검증", 
  "jsonpath-plus": "JSON Path 쿼리",
  "js-yaml": "YAML 변환",
  "papaparse": "CSV 변환",
  "xml-js": "XML 변환"
}
```

### 시각화
```json
{
  "@xyflow/svelte": "플로우차트 그래프",
  "d3-hierarchy": "트리 구조 시각화",
  "highlight.js": "코드 하이라이팅"
}
```

### 유틸리티
```json
{
  "jwt-decode": "JWT 디코딩",
  "fuse.js": "검색 기능",
  "file-saver": "파일 다운로드",
  "nanoid": "고유 ID 생성"
}
```

## 아키텍처

### 폴더 구조
```
src/
├── lib/
│   ├── components/          # 재사용 컴포넌트
│   │   ├── json/           # JSON 관련 컴포넌트
│   │   ├── ui/             # 기본 UI 컴포넌트
│   │   └── layout/         # 레이아웃 컴포넌트
│   ├── stores/             # Svelte stores
│   ├── utils/              # 유틸리티 함수
│   │   ├── json-parser.ts  # JSON 파싱 로직
│   │   ├── json-validator.ts # 검증 로직
│   │   ├── converters.ts   # 변환 로직
│   │   └── error-analyzer.ts # 오류 분석
│   └── types/              # TypeScript 타입 정의
├── routes/                 # SvelteKit 라우트
└── app.html               # HTML 템플릿
```

### 핵심 클래스

#### JSONParser
```typescript
class JSONParser {
  parse(text: string): ParseResult
  validate(text: string): ValidationResult
  getErrorLocation(error: Error): ErrorLocation
  getSuggestions(error: Error): string[]
}
```

#### JSONVisualizer  
```typescript
class JSONVisualizer {
  generateTree(data: object): TreeNode[]
  generateGraph(data: object): GraphNode[]
  getPath(node: TreeNode): string
  search(query: string): SearchResult[]
}
```

#### JSONConverter
```typescript
class JSONConverter {
  toXML(data: object): string
  toCSV(data: object): string
  toYAML(data: object): string
  minify(json: string): string
  beautify(json: string, options: FormatOptions): string
}
```

## 상태 관리

### Runes 기반 상태
```typescript
// JSON 데이터 상태
const jsonText = $state('');
const parsedData = $derived(parseJSON(jsonText));
const validationErrors = $derived(validateJSON(jsonText));

// UI 상태
const viewMode = $state<'text' | 'tree' | 'graph'>('text');
const isDarkMode = $state(false);
const isAutoUpdate = $state(true);

// 설정 상태
const formatOptions = $state({
  indent: 2,
  sortKeys: false,
  preserveOrder: true
});
```

## 성능 최적화

### 1. 지연 로딩
- 대용량 JSON 처리 시 가상 스크롤링
- 트리 노드 lazy loading
- 코드 스플리팅

### 2. 메모이제이션
- 파싱 결과 캐싱
- 검증 결과 캐싱
- 시각화 데이터 캐싱

### 3. 웹 워커
- 대용량 파일 파싱
- 복잡한 변환 작업
- 백그라운드 검증

## 브라우저 호환성
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## PWA 기능
- 오프라인 지원
- 설치 가능
- 백그라운드 동기화 