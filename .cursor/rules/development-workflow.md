# 개발 워크플로우

## Git 워크플로우

### 1. 브랜치 전략

#### 메인 브랜치
```
main: 배포 가능한 안정적인 코드
develop: 개발 중인 기능들이 통합되는 브랜치
```

#### 기능 브랜치
```
feature/[기능명]: 새로운 기능 개발
feat/json-parser: JSON 파서 구현
feat/tree-view: 트리 뷰 컴포넌트
feat/error-handling: 에러 처리 개선
```

#### 수정 브랜치
```
fix/[이슈명]: 버그 수정
hotfix/[긴급수정]: 프로덕션 긴급 수정
```

### 2. 커밋 메시지 규칙

#### 커밋 메시지 형식
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

#### 타입 정의
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅, 세미콜론 누락 등
refactor: 코드 리팩토링
test: 테스트 코드 추가/수정
chore: 빌드 업무 수정, 패키지 관리
perf: 성능 개선
```

#### 예시
```bash
feat(parser): JSON 파싱 에러 위치 정확도 개선

- 라인 및 컬럼 번호 정확한 계산 로직 추가
- 유니코드 문자 처리 개선
- 에러 메시지 한국어 번역 추가

Fixes #123
```

### 3. 코드 리뷰 프로세스

#### Pull Request 템플릿
```markdown
## 변경 사항
- [ ] 새로운 기능 추가
- [ ] 버그 수정  
- [ ] 문서 업데이트
- [ ] 성능 개선

## 상세 설명
[변경 사항에 대한 상세 설명]

## 테스트
- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 수동 테스트 완료

## 체크리스트
- [ ] 코딩 표준 준수
- [ ] 문서 업데이트
- [ ] 브레이킹 체인지 확인
```

#### 리뷰 기준
1. **기능성**: 요구사항 충족 여부
2. **코드 품질**: 가독성, 유지보수성
3. **성능**: 성능 저하 없는지 확인
4. **보안**: 보안 취약점 검토
5. **테스트**: 적절한 테스트 커버리지

## 개발 환경 설정

### 1. 로컬 개발 환경

#### 필수 도구
```bash
# Node.js (LTS 버전)
node --version  # v18.x 이상

# pnpm 패키지 매니저
npm install -g pnpm

# 프로젝트 의존성 설치
pnpm install
```

#### 환경 변수
```bash
# .env.local
VITE_API_URL=http://localhost:3000
VITE_APP_NAME="Perfect JSON Parse"
VITE_MAX_FILE_SIZE=5242880
```

#### 개발 서버 실행
```bash
# 개발 서버 시작
pnpm dev

# 특정 포트로 실행
pnpm dev --port 3000

# 네트워크 접근 허용
pnpm dev --host
```

### 2. 코드 품질 도구

#### ESLint 설정
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "plugin:svelte/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "svelte/no-at-html-tags": "error"
  }
}
```

#### Prettier 설정
```json
{
  "useTabs": false,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 80,
  "tabWidth": 2,
  "semi": true,
  "plugins": ["prettier-plugin-svelte"]
}
```

#### Husky 훅
```bash
# pre-commit 훅
#!/bin/sh
pnpm lint
pnpm type-check
pnpm test

# pre-push 훅  
#!/bin/sh
pnpm build
pnpm test:e2e
```

### 3. 테스팅 전략

#### 단위 테스트 (Vitest)
```typescript
// src/lib/utils/__tests__/json-parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseJson } from '../json-parser';

describe('parseJson', () => {
  it('should parse valid JSON', () => {
    const result = parseJson('{"name": "test"}');
    expect(result.isValid).toBe(true);
  });
});
```

#### 컴포넌트 테스트
```typescript
// src/lib/components/__tests__/JsonEditor.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import JsonEditor from '../JsonEditor.svelte';

it('should emit change event on input', async () => {
  const { component } = render(JsonEditor);
  const input = screen.getByRole('textbox');
  
  await fireEvent.input(input, { target: { value: '{}' } });
  
  expect(/* 결과 검증 */);
});
```

#### E2E 테스트 (Playwright)
```typescript
// tests/json-parsing.spec.ts
import { test, expect } from '@playwright/test';

test('JSON parsing workflow', async ({ page }) => {
  await page.goto('/');
  
  // JSON 입력
  await page.fill('[data-testid="json-input"]', '{"test": true}');
  
  // 결과 확인
  await expect(page.locator('[data-testid="parse-result"]'))
    .toContainText('Valid JSON');
});
```

## 빌드 및 배포

### 1. 빌드 프로세스

#### 개발 빌드
```bash
# 개발용 빌드
pnpm build:dev

# 타입 체크
pnpm type-check

# 번들 분석
pnpm analyze
```

#### 프로덕션 빌드
```bash
# 프로덕션 빌드
pnpm build

# 빌드 최적화 확인
pnpm build:analyze

# 미리보기
pnpm preview
```

### 2. Cloudflare Pages 배포

#### 배포 설정
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
      
      - uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: perfect-json-parse
          directory: build
```

#### 환경별 설정
```bash
# 개발 환경
VITE_APP_ENV=development

# 스테이징 환경  
VITE_APP_ENV=staging

# 프로덕션 환경
VITE_APP_ENV=production
```

## 성능 모니터링

### 1. 웹 바이탈 측정
```typescript
// src/lib/utils/performance.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

const sendToAnalytics = (metric: any) => {
  // 분석 도구로 전송
  console.log(metric);
};

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 2. 번들 크기 최적화
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte'],
          utils: ['src/lib/utils'],
          components: ['src/lib/components']
        }
      }
    }
  }
});
```

## 문제 해결

### 1. 일반적인 이슈

#### 메모리 누수
```typescript
// ✅ 적절한 클린업
$effect(() => {
  const subscription = subscribe();
  return () => subscription.unsubscribe();
});
```

#### 성능 저하
```typescript
// ✅ 디바운싱 적용
let searchTerm = $state('');
let debouncedSearch = $derived.by(() => {
  return debounce(searchTerm, 300);
});
```

### 2. 디버깅 도구

#### 개발자 도구 활용
```typescript
// 성능 프로파일링
console.time('JSON Parse');
const result = parseJson(largeJsonString);
console.timeEnd('JSON Parse');

// 메모리 사용량 체크
console.log(performance.memory);
```

### 3. 로깅 전략
```typescript
// src/lib/utils/logger.ts
export const logger = {
  debug: (message: string, data?: any) => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
  
  error: (message: string, error?: Error) => {
    console.error(`[ERROR] ${message}`, error);
    // 에러 리포팅 서비스로 전송
  }
};
```

## 문서화

### 1. README 업데이트
- 기능 추가/변경 시 README 업데이트
- 설치 및 실행 방법 명시
- 스크린샷 및 데모 링크 포함

### 2. 코드 문서화
- 복잡한 로직에는 주석 추가
- JSDoc으로 함수 문서화
- 타입 정의 명확히

### 3. 변경 로그
```markdown
# Changelog

## [1.2.0] - 2024-01-15
### Added
- JWT 디코더 기능
- Graph 뷰 확대/축소

### Fixed  
- JSON 파싱 오류 위치 표시 개선
- 모바일 UI 반응성 향상
``` 