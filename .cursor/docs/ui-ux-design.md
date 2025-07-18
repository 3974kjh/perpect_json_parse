# UI/UX 디자인 가이드

## 디자인 철학
- **직관적**: 한눈에 어떤 기능인지 알 수 있는 인터페이스
- **현대적**: 2024년 트렌드를 반영한 세련된 디자인
- **접근성**: 모든 사용자가 사용할 수 있는 포용적 디자인
- **반응형**: 데스크톱부터 모바일까지 완벽 지원

## 컬러 시스템

### 라이트 테마
```css
:root {
  /* Primary */
  --primary-50: #f0f9ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-700: #1d4ed8;
  
  /* Success (JSON 유효) */
  --success-50: #f0fdf4;
  --success-500: #22c55e;
  --success-600: #16a34a;
  
  /* Error (JSON 오류) */
  --error-50: #fef2f2;
  --error-500: #ef4444;
  --error-600: #dc2626;
  
  /* Warning */
  --warning-50: #fffbeb;
  --warning-500: #f59e0b;
  --warning-600: #d97706;
  
  /* Neutral */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-500: #6b7280;
  --gray-900: #111827;
}
```

### 다크 테마
```css
[data-theme="dark"] {
  --primary-50: #1e293b;
  --primary-500: #60a5fa;
  --primary-600: #3b82f6;
  
  --gray-50: #0f172a;
  --gray-100: #1e293b;
  --gray-900: #f8fafc;
}
```

## 타이포그래피

### 폰트 시스템
```css
--font-primary: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* 텍스트 크기 */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

## 레이아웃

### 메인 레이아웃
```
┌─────────────────────────────────────┐
│ Header (툴바 + 메뉴)                 │
├─────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────────┐ │
│ │             │ │                 │ │
│ │   JSON      │ │  시각화 영역     │ │
│ │   입력      │ │                 │ │
│ │   영역      │ │  - Tree View    │ │
│ │             │ │  - Graph View   │ │
│ │             │ │  - Text View    │ │
│ └─────────────┘ └─────────────────┘ │
├─────────────────────────────────────┤
│ Footer (상태 바 + 통계)              │
└─────────────────────────────────────┘
```

### 모바일 레이아웃
```
┌─────────────────────┐
│ Header (축약형)      │
├─────────────────────┤
│ 탭 전환             │ 
│ [입력] [시각화]      │
├─────────────────────┤
│                     │
│   활성 탭 컨텐츠     │
│                     │
│                     │
├─────────────────────┤
│ 상태 바             │
└─────────────────────┘
```

## 컴포넌트 디자인

### 버튼
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size: 'sm' | 'md' | 'lg';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
}
```

### 입력 필드
```css
.input {
  /* 기본 스타일 */
  border: 1px solid var(--gray-300);
  border-radius: 8px;
  padding: 12px 16px;
  
  /* 포커스 상태 */
  &:focus {
    border-color: var(--primary-500);
    box-shadow: 0 0 0 3px var(--primary-50);
  }
  
  /* 오류 상태 */
  &.error {
    border-color: var(--error-500);
    box-shadow: 0 0 0 3px var(--error-50);
  }
}
```

### 코드 에디터
```css
.code-editor {
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.5;
  
  /* 구문 하이라이팅 */
  .token.string { color: var(--success-600); }
  .token.number { color: var(--primary-600); }
  .token.boolean { color: var(--warning-600); }
  .token.null { color: var(--gray-500); }
  .token.key { color: var(--primary-700); }
  
  /* 오류 하이라이팅 */
  .error-line {
    background-color: var(--error-50);
    border-left: 3px solid var(--error-500);
  }
}
```

## 애니메이션

### 트랜지션
```css
/* 기본 트랜지션 */
.transition-base {
  transition: all 150ms ease-in-out;
}

/* 호버 효과 */
.hover-lift {
  transition: transform 150ms ease-in-out;
}
.hover-lift:hover {
  transform: translateY(-2px);
}

/* 로딩 애니메이션 */
@keyframes spin {
  to { transform: rotate(360deg); }
}
.loading {
  animation: spin 1s linear infinite;
}
```

### 페이드 인/아웃
```css
.fade-enter {
  opacity: 0;
  transform: translateY(10px);
}
.fade-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms, transform 300ms;
}
```

## 상호작용 패턴

### 드래그 앤 드롭
- 파일을 드래그하면 업로드 영역 하이라이트
- 시각적 피드백으로 드롭 가능 영역 표시
- 파일 타입 검증 및 오류 메시지

### 실시간 검증
- 타이핑 중에도 실시간으로 오류 표시
- 디바운싱으로 성능 최적화 (300ms)
- 오류 위치를 정확하게 하이라이트

### 툴팁
```css
.tooltip {
  position: relative;
}
.tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  background: var(--gray-900);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: var(--text-sm);
  white-space: nowrap;
  z-index: 1000;
}
```

## 접근성 (a11y)

### 키보드 네비게이션
- Tab 순서 논리적 배치
- Skip links 제공
- 포커스 표시 명확히

### 스크린 리더
```html
<!-- ARIA 라벨 -->
<button aria-label="JSON 포맷팅">
<div role="alert" aria-live="polite">오류 메시지</div>

<!-- 시맨틱 HTML -->
<main>
  <section aria-labelledby="editor-heading">
    <h2 id="editor-heading">JSON 편집기</h2>
  </section>
</main>
```

### 색상 대비
- WCAG 2.1 AA 기준 준수 (4.5:1 이상)
- 색상에만 의존하지 않는 정보 전달
- 다크 모드에서도 충분한 대비

## 모바일 최적화

### 터치 타겟
- 최소 44px × 44px 크기
- 충분한 간격 (8px 이상)
- 제스처 지원 (핀치 줌, 스와이프)

### 성능
- 이미지 최적화
- 지연 로딩
- 캐싱 전략 