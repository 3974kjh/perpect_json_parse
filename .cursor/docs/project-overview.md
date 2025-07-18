# JSON Parse 테스트기 프로젝트 개요

## 프로젝트 정보
- **프로젝트명**: Perfect JSON Parse - JSON 파싱 및 검증 도구
- **개발언어**: Svelte 5 + Runes
- **배포환경**: Cloudflare Pages (무료)
- **타입**: Frontend Only (Backend 불필요)
- **저장소**: localStorage 활용

## 핵심 기능

### 1. JSON Parse 오류 검증 및 디버깅 (핵심)
- JSON.parse 오류 발생 시 정확한 위치 표시
- 오류 원인 분석 및 수정 제안
- 라인별 오류 하이라이팅
- 상세한 오류 메시지 제공

### 2. 계층화된 JSON 구조 시각화 (핵심)
- Tree View: 계층적 트리 구조 표시
- Graph View: 플로우차트 형태 시각화
- 확장/축소 기능
- 경로 표시 (JSON Path)

## 추가 기능 (참고 사이트 분석 기반)

### 3. JSON 편집 및 포맷팅
- 실시간 JSON 포맷팅
- 다양한 들여쓰기 옵션 (2-8 spaces, tab)
- JSON Minify/Beautify
- 실시간 검증 (Auto Update)

### 4. 데이터 변환
- JSON to XML
- JSON to CSV  
- JSON to YAML
- Minified ↔ Formatted 변환

### 5. 고급 기능
- JWT 토큰 디코더
- JSON Schema 검증
- 이미지 URL 미리보기
- JSON 내 검색 기능
- 대용량 파일 지원
- Big Number 지원

### 6. 사용자 편의 기능
- 파일 업로드/다운로드
- URL에서 JSON 가져오기
- 클립보드 복사/붙여넣기
- 다크/라이트 모드
- 히스토리 기능 (localStorage)
- 공유 링크 생성

### 7. 시각화 도구
- JSON 구조 통계 (깊이, 노드 수 등)
- 데이터 타입별 색상 구분
- 접기/펼치기 전체 토글
- 경로 네비게이션

## 차별화 포인트

1. **정확한 오류 디버깅**: 다른 도구보다 더 정확한 오류 위치 표시
2. **다중 시각화**: Tree + Graph + Text 뷰 동시 지원
3. **실시간 검증**: 타이핑과 동시에 오류 검증
4. **한국어 오류 메시지**: 한국어로 된 친화적인 오류 설명
5. **모바일 최적화**: 반응형 디자인
6. **오프라인 지원**: 브라우저에서 완전 동작 