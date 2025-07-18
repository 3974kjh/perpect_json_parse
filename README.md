# Perfect JSON Parse

> JSON 파싱 오류를 정확하게 찾아주고 계층적 구조로 시각화해주는 현대적인 JSON 도구

![JSON Parse Screenshot](https://via.placeholder.com/800x400/3B82F6/FFFFFF?text=Perfect+JSON+Parse)

## 🚀 핵심 기능

### 🔍 정밀한 오류 검증 (핵심)
- **실시간 JSON 검증**: 타이핑하는 동시에 오류 검출
- **정확한 위치 표시**: 오류가 발생한 정확한 라인과 컬럼 번호 표시
- **한국어 오류 메시지**: 이해하기 쉬운 한국어 오류 설명
- **수정 제안**: 일반적인 JSON 오류에 대한 자동 수정 제안

### 🌳 계층적 구조 시각화 (핵심)
- **트리 뷰**: JSON 데이터를 계층적 트리 구조로 표시
- **확장/축소**: 필요한 부분만 펼쳐서 확인
- **타입별 색상**: 데이터 타입에 따른 직관적 색상 구분
- **JSON Path 표시**: 특정 노드의 경로 정보 제공

### ⚡ 추가 기능
- **실시간 포맷팅**: JSON 자동 정렬 및 들여쓰기
- **압축/해제**: Minify/Beautify 기능
- **다크 모드**: 눈에 편한 다크 테마 지원
- **파일 다운로드**: 편집된 JSON 파일 저장
- **클립보드 복사**: 한 번의 클릭으로 결과 복사
- **자동 저장**: 작업 내용 자동 저장 (localStorage)

## 🛠️ 기술 스택

- **Frontend**: Svelte 5 with Runes
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Build**: Vite
- **Deploy**: Cloudflare Pages

## 📦 설치 및 실행

### 필수 요구사항
- Node.js 18.x 이상
- pnpm (권장) 또는 npm

### 설치
```bash
# 저장소 클론
git clone https://github.com/yourusername/perfect-json-parse.git
cd perfect-json-parse

# 의존성 설치
pnpm install
# 또는
npm install
```

### 개발 서버 실행
```bash
# 개발 서버 시작
pnpm dev
# 또는
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

### 빌드
```bash
# 프로덕션 빌드
pnpm build
# 또는
npm run build

# 빌드 미리보기
pnpm preview
# 또는
npm run preview
```

## 🎯 사용법

1. **JSON 입력**: 왼쪽 텍스트 영역에 JSON 데이터를 입력하세요
2. **실시간 검증**: 입력과 동시에 오류가 있다면 하단에 표시됩니다
3. **시각화**: 상단의 "트리" 버튼을 클릭하여 계층적 구조를 확인하세요
4. **도구 사용**: 상단 도구 모음의 버튼들로 포맷팅, 압축 등을 수행하세요

### 샘플 데이터
처음 사용할 때는 "샘플 로드" 버튼을 클릭하여 예제 JSON을 확인해보세요.

## 🌟 차별화 포인트

### 다른 JSON 도구 대비 장점
1. **정확한 오류 위치**: 다른 도구보다 더 정확한 오류 위치 표시
2. **한국어 지원**: 친화적인 한국어 오류 메시지
3. **실시간 검증**: 타이핑과 동시에 즉시 피드백
4. **다중 시각화**: Text + Tree 뷰 동시 지원
5. **모바일 최적화**: 반응형 디자인으로 모든 기기 지원
6. **오프라인 지원**: 브라우저에서 완전 동작 (백엔드 불필요)

## 🔧 개발 정보

### 프로젝트 구조
```
src/
├── lib/
│   ├── components/          # 재사용 컴포넌트
│   │   ├── json/           # JSON 관련 컴포넌트
│   │   ├── ui/             # 기본 UI 컴포넌트
│   │   └── layout/         # 레이아웃 컴포넌트
│   ├── stores/             # 상태 관리 (Svelte 5 Runes)
│   ├── utils/              # 유틸리티 함수
│   │   ├── json-parser.ts  # JSON 파싱 로직
│   │   ├── tree-generator.ts # 트리 생성 로직
│   │   └── formatters.ts   # 형식 변환 로직
│   └── types/              # TypeScript 타입 정의
├── routes/                 # SvelteKit 라우트
└── app.html               # HTML 템플릿
```

### 에러 타입
프로젝트에서 감지하는 주요 JSON 오류들:
- `SYNTAX_ERROR`: 일반적인 문법 오류
- `UNEXPECTED_TOKEN`: 예상치 못한 토큰
- `UNCLOSED_STRING`: 닫히지 않은 문자열
- `TRAILING_COMMA`: 후행 쉼표
- `DUPLICATE_KEY`: 중복된 키
- `INVALID_ESCAPE`: 잘못된 이스케이프 문자

## 🚀 배포

이 프로젝트는 Cloudflare Pages에 최적화되어 있습니다.

```bash
# 빌드
pnpm build

# build 폴더를 Cloudflare Pages에 업로드
```

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🙏 감사의 말

- [Svelte](https://svelte.dev/) - 놀라운 프론트엔드 프레임워크
- [TailwindCSS](https://tailwindcss.com/) - 유틸리티 우선 CSS 프레임워크
- [Vite](https://vitejs.dev/) - 빠른 빌드 도구

## 📞 연락처

프로젝트 관련 문의나 버그 리포트는 GitHub Issues를 이용해주세요.

---

⭐ 이 프로젝트가 도움이 되셨다면 별표를 눌러주세요!
