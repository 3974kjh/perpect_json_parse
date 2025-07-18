<script lang="ts">
  import { onMount } from 'svelte';
  import { parseJson } from '$lib/utils/json-parser';
  import { generateTree } from '$lib/utils/tree-generator';
  import { jsonToXml, jsonToCsv, jsonToYaml } from '$lib/utils/formatters';
  import type { ParseResult, TreeNode } from '$lib/types';
  
  // Toast 타입 정의
  interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration: number;
  }
  
  // 상태 관리
  let jsonText = $state('');
  let viewMode = $state<'text' | 'tree' | 'graph'>('text');
  let isDarkMode = $state(false);
  let parseResult = $state<ParseResult>({ data: null, isValid: false, errors: [] });
  let treeData = $state<TreeNode[]>([]);
  let showErrorAnalysis = $state(false);
  let stats = $state({ characters: 0, lines: 0, size: 0, isValid: false });
  let textareaElement: HTMLTextAreaElement;
  let lineNumbersElement: HTMLDivElement;
  let actualLineHeight = 21; // default value
  
  // 트리 노드 확장 상태 관리
  let expandedNodes = $state(new Set<string>());
  
  // Toast 상태 관리
  let toasts = $state<Toast[]>([]);
  let toastId = 0;

  // 반응형 업데이트
  $effect(() => {
    const result = jsonText.trim() ? parseJson(jsonText) : { data: null, isValid: false, errors: [] };
    parseResult = result;
    
    if (result.isValid && result.data !== null) {
      const newTreeData = generateTree(result.data);
      treeData = newTreeData;
      showErrorAnalysis = false;
      
      // 트리 뷰일 때 첫 번째 레벨 자동 확장
      if (viewMode === 'tree' && newTreeData.length > 0) {
        const firstLevelKeys = new Set<string>();
        newTreeData.forEach(node => {
          if (node.children && node.children.length > 0) {
            firstLevelKeys.add(node.key);
          }
        });
        expandedNodes = firstLevelKeys;
      }
    } else {
      treeData = [];
      showErrorAnalysis = result.errors.length > 0;
    }
    
    stats = {
      characters: jsonText.length,
      lines: jsonText.split('\n').length,
      size: new Blob([jsonText]).size,
      isValid: result.isValid
    };
  });

  // 뷰 모드 변경 시 첫 번째 레벨 자동 확장
  $effect(() => {
    if (viewMode === 'tree' && treeData.length > 0) {
      const firstLevelKeys = new Set<string>();
      treeData.forEach(node => {
        if (node.children && node.children.length > 0) {
          firstLevelKeys.add(node.key);
        }
      });
      expandedNodes = firstLevelKeys;
    }
  });

  // 트리 노드 토글 함수
  function toggleNode(nodeKey: string) {
    if (expandedNodes.has(nodeKey)) {
      expandedNodes.delete(nodeKey);
    } else {
      expandedNodes.add(nodeKey);
    }
    // Set 객체 업데이트를 위해 새로운 Set 생성
    expandedNodes = new Set(expandedNodes);
  }

  // 노드 키 생성 함수
  function getNodeKey(node: TreeNode, parentKey: string = ''): string {
    return parentKey ? `${parentKey}.${node.key}` : node.key;
  }

  // 모든 노드 확장/축소
  function expandAll() {
    const allKeys = new Set<string>();
    function collectKeys(nodes: TreeNode[], parentKey: string = '') {
      nodes.forEach(node => {
        const nodeKey = getNodeKey(node, parentKey);
        if (node.children && node.children.length > 0) {
          allKeys.add(nodeKey);
          collectKeys(node.children, nodeKey);
        }
      });
    }
    collectKeys(treeData);
    expandedNodes = allKeys;
  }

  function collapseAll() {
    expandedNodes = new Set();
  }

  // TreeNode 렌더링 함수
  function renderTreeNode(node: TreeNode, parentKey: string = '', depth: number = 0): any {
    const nodeKey = getNodeKey(node, parentKey);
    const isExpanded = expandedNodes.has(nodeKey);
    const hasChildren = node.children && node.children.length > 0;
    
    return {
      node,
      nodeKey,
      isExpanded,
      hasChildren,
      depth,
      children: isExpanded && hasChildren ? node.children.map(child => 
        renderTreeNode(child, nodeKey, depth + 1)
      ) : []
    };
  }
  
  // 실제 줄 높이 계산 함수
  function calculateLineHeight() {
    if (textareaElement) {
      const computedStyle = window.getComputedStyle(textareaElement);
      actualLineHeight = parseFloat(computedStyle.lineHeight) || 21;
      
      // 줄번호의 높이도 동적으로 조정
      if (lineNumbersElement) {
        const lineNumbers = lineNumbersElement.querySelectorAll('.line-number');
        lineNumbers.forEach((lineNumber: Element) => {
          (lineNumber as HTMLElement).style.height = `${actualLineHeight}px`;
          (lineNumber as HTMLElement).style.lineHeight = `${actualLineHeight}px`;
        });
      }
    }
  }

  // 스크롤 동기화 함수
  function syncScroll() {
    if (textareaElement && lineNumbersElement) {
      lineNumbersElement.scrollTop = textareaElement.scrollTop;
    }
  }

  // 오류 위치로 스크롤하는 함수
  function scrollToError(error: any) {
    if (!textareaElement || !error.line || !error.column) return;
    
    const lines = jsonText.split('\n');
    let charPosition = 0;
    
    // 해당 라인까지의 문자 수 계산
    for (let i = 0; i < error.line - 1; i++) {
      charPosition += lines[i].length + 1; // +1 for newline
    }
    charPosition += error.column - 1;
    
    // 텍스트 에리어 포커스 및 커서 이동
    textareaElement.focus();
    textareaElement.setSelectionRange(charPosition, charPosition + 1);
    
    // 정확한 줄 높이로 스크롤 계산
    const targetScrollTop = (error.line - 1) * actualLineHeight;
    const maxScroll = textareaElement.scrollHeight - textareaElement.clientHeight;
    
    textareaElement.scrollTop = Math.min(targetScrollTop, maxScroll);
    
    // 라인 번호도 동기화
    syncScroll();
  }

  // 오류 라인 하이라이트를 위한 CSS 적용
  function highlightErrorLine() {
    if (!textareaElement || parseResult.errors.length === 0) return;
    
    // 배경 하이라이트는 CSS로 처리하고, 여기서는 라인 정보만 전달
    const errorLines = parseResult.errors.map(error => error.line).filter(Boolean);
    textareaElement.setAttribute('data-error-lines', errorLines.join(','));
  }

  // 텍스트 변경 시 하이라이트 업데이트
  $effect(() => {
    if (textareaElement) {
      highlightErrorLine();
    }
  });
  
  // 샘플 JSON 데이터
  const sampleJson = `{
  "name": "Perfect JSON Parse",
  "version": "1.0.0",
  "description": "JSON 파싱 및 검증 도구",
  "features": [
    "실시간 JSON 검증",
    "트리 구조 시각화",
    "오류 위치 표시",
    "다양한 형식 변환"
  ],
  "settings": {
    "theme": "light",
    "autoValidate": true,
    "maxFileSize": 5242880
  },
  "users": [
    {
      "id": 1,
      "name": "김개발",
      "email": "dev@example.com",
      "active": true
    },
    {
      "id": 2,
      "name": "이테스터",
      "email": "test@example.com",
      "active": false
    }
  ],
  "metadata": {
    "created": "2024-01-15T10:30:00Z",
    "updated": null,
    "tags": ["json", "parser", "validator"]
  }
}`;

  function loadSample() {
    jsonText = sampleJson;
  }
  
  function formatJson() {
    if (parseResult.isValid) {
      jsonText = JSON.stringify(parseResult.data, null, 2);
    }
  }
  
  function minifyJson() {
    if (parseResult.isValid) {
      jsonText = JSON.stringify(parseResult.data);
    }
  }
  
  function clearJson() {
    jsonText = '';
  }
  
  function downloadJson() {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function copyToClipboard() {
    navigator.clipboard.writeText(jsonText).then(() => {
      showToast('클립보드에 복사되었습니다!', 'success');
    }).catch(() => {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    });
  }
  
  // Toast 함수들
  function showToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) {
    const toast: Toast = {
      id: ++toastId,
      message,
      type,
      duration
    };
    toasts = [...toasts, toast];
    
    // 자동 제거
    setTimeout(() => {
      removeToast(toast.id);
    }, duration);
  }
  
  function removeToast(id: number) {
    toasts = toasts.filter(toast => toast.id !== id);
  }
  
  function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }
  
  onMount(() => {
    // 저장된 설정 불러오기
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      isDarkMode = true;
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    
    // 마지막 JSON 내용 복원
    const lastContent = localStorage.getItem('json-parser-last-content');
    if (lastContent && !jsonText) {
      jsonText = lastContent;
    }

    // 줄 높이 계산
    calculateLineHeight();
  });
  
  // 자동 저장
  $effect(() => {
    if (jsonText) {
      localStorage.setItem('json-parser-last-content', jsonText);
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
      
      // 줄 높이 재계산 (텍스트 변경 시)
      setTimeout(() => calculateLineHeight(), 0);
    }
  });
</script>

<svelte:head>
  <title>Perfect JSON Parse - JSON 파싱 및 검증 도구</title>
  <meta name="description" content="JSON 파싱 오류를 정확하게 찾아주고 계층적 구조로 시각화해주는 도구입니다." />
</svelte:head>

<main class="h-screen bg-gray-50 flex flex-col" data-theme={isDarkMode ? 'dark' : 'light'}>
  <!-- Header -->
  <header class="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
    <div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <div class="flex items-center">
          <h1 class="text-2xl font-bold text-gray-900">Perfect JSON Parse</h1>
          <span class="ml-3 text-sm text-gray-500">JSON 파싱 & 검증 도구</span>
        </div>
        
        <div class="flex items-center space-x-4">
          <!-- 다크 모드 토글 -->
          <button 
            class="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            on:click={toggleTheme}
            title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {#if isDarkMode}
              ☀️
            {:else}
              🌙
            {/if}
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <div class="flex-1 flex min-h-0">
    <!-- Left and Center Content -->
    <div class="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-4">
      <!-- 도구 모음 -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4 flex-shrink-0">
        <div class="flex flex-wrap items-center gap-3">
          <!-- 기본 작업 -->
          <div class="flex items-center gap-2">
            <button 
              class="toolbar-button primary"
              on:click={loadSample}
              title="샘플 JSON 데이터 로드"
            >
              <span class="button-icon">📝</span>
              샘플 로드
            </button>
            
            <button 
              class="toolbar-button secondary"
              on:click={clearJson}
              title="입력된 JSON 텍스트 지우기"
            >
              <span class="button-icon">🗑️</span>
              지우기
            </button>
          </div>
          
          <div class="toolbar-divider"></div>
          
          <!-- JSON 변환 -->
          <div class="flex items-center gap-2">
            <button 
              class="toolbar-button success"
              on:click={formatJson}
              disabled={!parseResult.isValid}
              title="JSON을 읽기 쉽게 포맷팅"
            >
              <span class="button-icon">✨</span>
              포맷팅
            </button>
            
            <button 
              class="toolbar-button warning"
              on:click={minifyJson}
              disabled={!parseResult.isValid}
              title="JSON을 압축하여 용량 최소화"
            >
              <span class="button-icon">📦</span>
              압축
            </button>
          </div>
          
          <div class="toolbar-divider"></div>
          
          <!-- 내보내기 -->
          <div class="flex items-center gap-2">
            <button 
              class="toolbar-button info"
              on:click={copyToClipboard}
              title="클립보드에 복사"
            >
              <span class="button-icon">📋</span>
              복사
            </button>
            
            <button 
              class="toolbar-button info"
              on:click={downloadJson}
              title="JSON 파일로 다운로드"
            >
              <span class="button-icon">💾</span>
              다운로드
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0 main-content-grid">
        <!-- JSON 입력 영역 -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col json-input-card">
          <div class="flex items-center justify-between p-3 border-b border-gray-200 flex-shrink-0">
            <h2 class="text-lg font-semibold text-gray-900 ml-1">JSON 입력</h2>
            <div class="flex items-center space-x-2 text-sm text-gray-500 h-8">
              <span>{stats.characters}자</span>
              <span>•</span>
              <span>{stats.lines}줄</span>
              <span>•</span>
              <span>{Math.round(stats.size / 1024)}KB</span>
            </div>
          </div>
          
          <div class="flex-1 p-2 min-h-0 json-input-content">
            <div class="json-editor-container h-full">
              <textarea
                bind:this={textareaElement}
                bind:value={jsonText}
                on:scroll={syncScroll}
                class="w-full h-full p-3 border border-gray-300 rounded-lg font-mono text-sm leading-relaxed resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                class:border-red-300={parseResult.errors.length > 0}
                class:bg-red-50={parseResult.errors.length > 0}
                class:has-errors={parseResult.errors.length > 0}
                placeholder="JSON 데이터를 입력하세요..."
                spellcheck="false"
              ></textarea>
              
              <!-- 라인 번호 표시 개선 -->
              {#if jsonText}
                <div class="line-numbers" bind:this={lineNumbersElement}>
                  {#each Array(stats.lines) as _, i}
                    <div class="line-number" class:error-line={parseResult.errors.some(e => e.line === i + 1)}>
                      {i + 1}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
          
          <!-- 간단한 오류 표시 -->
          {#if parseResult.errors.length > 0}
            <div class="p-4 border-t border-gray-200 bg-red-50 flex-shrink-0">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-red-800">오류 감지됨</h3>
                <button 
                  class="text-xs text-blue-600 hover:text-blue-800"
                  on:click={() => showErrorAnalysis = !showErrorAnalysis}
                >
                  {showErrorAnalysis ? '간단히 보기' : '자세히 분석'}
                </button>
              </div>
              
              <div class="text-sm text-red-700">
                {parseResult.errors.length}개의 오류가 발견되었습니다. 자세한 분석을 확인하세요.
              </div>
            </div>
          {:else if parseResult.isValid}
            <div class="p-4 border-t border-gray-200 bg-green-50 flex-shrink-0">
              <div class="flex items-center text-green-800">
                <span class="text-sm font-medium">✓ 유효한 JSON입니다</span>
              </div>
            </div>
          {/if}
        </div>

        <!-- 시각화 영역 또는 오류 분석 -->
        {#if showErrorAnalysis && parseResult.errors.length > 0}
          <!-- 상세 오류 분석 패널 -->
          <div class="bg-white rounded-lg shadow-sm border border-red-200 error-analysis-panel flex flex-col max-h-full">
            <div class="flex items-center justify-between p-4 border-b border-red-200 bg-red-50 flex-shrink-0">
              <div class="flex items-center gap-3">
                <h2 class="text-lg font-semibold text-red-800">오류 분석 및 수정 가이드</h2>
                <span class="px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full">
                  {parseResult.errors.length}개 오류
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button 
                  class="text-sm text-gray-600 hover:text-gray-800"
                  on:click={() => showErrorAnalysis = false}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div class="flex-1 p-2 overflow-y-auto scrollbar-thin min-h-0 error-analysis-content">
              {#each parseResult.errors as error, index}
                <div class="mb-6 p-4 border border-red-200 rounded-lg bg-red-50 error-card">
                  <div class="flex items-start justify-between mb-3">
                    <div class="flex-1">
                      <h4 class="font-semibold text-red-800 mb-2">
                        오류 #{index + 1}: {error.message}
                      </h4>
                      {#if error.line && error.column}
                        <p class="text-sm text-red-600 mb-2">
                          📍 위치: 라인 {error.line}, 컬럼 {error.column}
                        </p>
                      {/if}
                    </div>
                    
                    <div class="flex gap-2 flex-shrink-0">
                      {#if error.line && error.column}
                        <button 
                          class="action-button primary text-xs px-2 py-1"
                          on:click={() => scrollToError(error)}
                        >
                          📍 이동
                        </button>
                      {/if}
                    </div>
                  </div>
                  
                  {#if error.suggestion}
                    <div class="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <h5 class="text-sm font-medium text-yellow-800 mb-1">💡 수정 제안</h5>
                      <p class="text-sm text-yellow-700">{error.suggestion}</p>
                    </div>
                  {/if}
                  
                  <!-- 구체적인 수정 예시 - 축약된 버전 -->
                  {#if error.code === 'TRAILING_COMMA'}
                    <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 수정 예시</h5>
                      <div class="code-example">
                        <div class="text-red-600 mb-1 text-xs">❌ 잘못된 형태:</div>
                        <div class="error-example mb-2 text-xs">
                          {`{ "key": "value", }`}
                        </div>
                        <div class="text-green-600 mb-1 text-xs">✅ 올바른 형태:</div>
                        <div class="correct-example text-xs">
                          {`{ "key": "value" }`}
                        </div>
                      </div>
                    </div>
                  {:else if error.code === 'UNTERMINATED_STRING'}
                    <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 수정 예시</h5>
                      <div class="code-example">
                        <div class="text-red-600 mb-1 text-xs">❌ 잘못된 형태:</div>
                        <div class="error-example mb-2 text-xs">
                          {`{ "key": "value }`}
                        </div>
                        <div class="text-green-600 mb-1 text-xs">✅ 올바른 형태:</div>
                        <div class="correct-example text-xs">
                          {`{ "key": "value" }`}
                        </div>
                      </div>
                    </div>
                  {:else if error.code === 'DUPLICATE_KEY'}
                    <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 수정 예시</h5>
                      <div class="code-example">
                        <div class="text-red-600 mb-1 text-xs">❌ 잘못된 형태:</div>
                        <div class="error-example mb-2 text-xs">
                          {`{ "name": "값1", "name": "값2" }`}
                        </div>
                        <div class="text-green-600 mb-1 text-xs">✅ 올바른 형태:</div>
                        <div class="correct-example text-xs">
                          {`{ "name": "값1", "name2": "값2" }`}
                        </div>
                      </div>
                    </div>
                  {:else if error.code === 'INVALID_ESCAPE_SEQUENCE'}
                    <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 수정 예시</h5>
                      <div class="code-example">
                        <div class="text-red-600 mb-1 text-xs">❌ 잘못된 형태:</div>
                        <div class="error-example mb-2 text-xs">
                          {`{ "path": "C:\\\\Documents\\x" }`}
                        </div>
                        <div class="text-green-600 mb-1 text-xs">✅ 올바른 형태:</div>
                        <div class="correct-example text-xs">
                          {`{ "path": "C:\\\\Documents\\\\file" }`}
                        </div>
                      </div>
                    </div>
                  {:else if error.code === 'INVALID_NUMBER'}
                    <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 수정 예시</h5>
                      <div class="code-example">
                        <div class="text-red-600 mb-1 text-xs">❌ 잘못된 형태:</div>
                        <div class="error-example mb-2 text-xs">
                          {`{ "number": 01.5 }`}
                        </div>
                        <div class="text-green-600 mb-1 text-xs">✅ 올바른 형태:</div>
                        <div class="correct-example text-xs">
                          {`{ "number": 1.5 }`}
                        </div>
                      </div>
                    </div>
                  {:else if error.code === 'NEWLINE_IN_STRING'}
                    <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 수정 예시</h5>
                      <div class="code-example">
                        <div class="text-red-600 mb-1 text-xs">❌ 잘못된 형태:</div>
                        <div class="error-example mb-2 text-xs">
                          {`{ "text": "첫째 줄\n둘째 줄" }`}
                        </div>
                        <div class="text-green-600 mb-1 text-xs">✅ 올바른 형태:</div>
                        <div class="correct-example text-xs">
                          {`{ "text": "첫째 줄\\n둘째 줄" }`}
                        </div>
                      </div>
                    </div>
                  {:else if error.code === 'UNEXPECTED_END'}
                    <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 수정 예시</h5>
                      <div class="code-example">
                        <div class="text-red-600 mb-1 text-xs">❌ 잘못된 형태:</div>
                        <div class="error-example mb-2 text-xs">
                          {`{ "key": "value"`}
                        </div>
                        <div class="text-green-600 mb-1 text-xs">✅ 올바른 형태:</div>
                        <div class="correct-example text-xs">
                          {`{ "key": "value" }`}
                        </div>
                      </div>
                    </div>
                  {:else if error.code === 'INVALID_VALUE'}
                    <div class="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h5 class="text-sm font-medium text-blue-800 mb-2">🔧 수정 예시</h5>
                      <div class="code-example">
                        <div class="text-red-600 mb-1 text-xs">❌ 잘못된 형태:</div>
                        <div class="error-example mb-2 text-xs">
                          {`{ "value": undefined }`}
                        </div>
                        <div class="text-green-600 mb-1 text-xs">✅ 올바른 형태:</div>
                        <div class="correct-example text-xs">
                          {`{ "value": null }`}
                        </div>
                      </div>
                    </div>
                  {/if}
                  
                  <!-- 문맥 정보 - 간소화 -->
                  {#if error.line && jsonText.split('\n')[error.line - 1]}
                    <div class="p-3 bg-gray-50 border border-gray-200 rounded">
                      <h5 class="text-sm font-medium text-gray-800 mb-2">📄 오류 라인</h5>
                      <div class="error-line-display">
                        {jsonText.split('\n')[error.line - 1] || '(빈 라인)'}
                      </div>
                      
                      <!-- 간단한 수정 방법 -->
                      <div class="p-2 bg-blue-50 border border-blue-200 rounded">
                        <h6 class="text-xs font-semibold text-blue-800 mb-1">🔧 수정 방법:</h6>
                        <div class="text-xs text-blue-700">
                          {#if error.code === 'TRAILING_COMMA'}
                            마지막 요소 뒤의 쉼표(,)를 제거하세요
                          {:else if error.code === 'UNTERMINATED_STRING'}
                            문자열을 닫는 큰따옴표(")를 추가하세요
                          {:else if error.code === 'DUPLICATE_KEY'}
                            중복된 키 이름을 다른 이름으로 변경하세요
                          {:else if error.code === 'NEWLINE_IN_STRING'}
                            문자열 내의 줄바꿈을 \\n으로 이스케이프하세요
                          {:else if error.code === 'SYNTAX_ERROR'}
                            JSON 문법을 확인하세요 (중괄호, 대괄호, 쉼표 등)
                          {:else if error.code === 'UNEXPECTED_TOKEN'}
                            예상치 못한 문자나 토큰을 확인하세요
                          {:else if error.code === 'UNEXPECTED_END'}
                            닫히지 않은 중괄호, 대괄호, 따옴표를 확인하세요
                          {:else if error.code === 'INVALID_CHARACTER'}
                            유효하지 않은 문자를 제거하거나 올바른 문자로 교체하세요
                          {:else if error.code === 'INVALID_ESCAPE_SEQUENCE'}
                            올바른 이스케이프 시퀀스를 사용하세요 (\\", \\\\, \\/, \\n, \\t 등)
                          {:else if error.code === 'INVALID_UNICODE_ESCAPE'}
                            유니코드 이스케이프는 \\uXXXX 형식이어야 합니다
                          {:else if error.code === 'INVALID_NUMBER'}
                            ECMAScript 숫자 형식을 따르세요 (선행 0 제거 등)
                          {:else if error.code === 'INVALID_VALUE'}
                            유효한 JSON 값만 사용하세요 (문자열, 숫자, true/false, null, 객체, 배열)
                          {:else}
                            해당 위치의 JSON 문법을 다시 확인해보세요
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
              
              <!-- 요약 정보 -->
              {#if parseResult.errors.length > 5}
                <div class="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <h4 class="font-semibold text-indigo-800 mb-2">📋 ECMAScript JSON 사양 기본 원칙</h4>
                  <ul class="text-sm text-indigo-700 space-y-1">
                    <li>• 모든 문자열은 큰따옴표 ""로 감싸야 합니다</li>
                    <li>• 키와 값은 콜론 :으로 구분하고, 여러 항목은 쉼표 ,로 구분합니다</li>
                    <li>• 마지막 요소 뒤에는 쉼표를 넣지 않습니다 (후행 쉼표 불허)</li>
                    <li>• 객체 내 키는 고유해야 합니다 (중복 키 불허)</li>
                    <li>• 문자열 내 줄바꿈은 \\n으로 이스케이프해야 합니다</li>
                  </ul>
                  <div class="mt-3 text-xs text-indigo-600">
                    <p>📖 참고: <a href="https://tc39.es/ecma262/multipage/structured-data.html#sec-json-object" target="_blank" class="underline">ECMAScript JSON 사양</a></p>
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {:else}
          <!-- 기존 시각화 영역 -->
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col visualization-card">
            <div class="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
              <h2 class="text-lg font-semibold text-gray-900 ml-2">
                {viewMode === 'text' ? '포맷된 JSON' : '트리 구조'}
              </h2>
              <div class="flex items-center">
                <!-- 개선된 뷰 모드 전환 탭 -->
                <div class="inline-flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button 
                    class="inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-md transition-all duration-200 view-mode-tab"
                    class:active={viewMode === 'text'}
                    on:click={() => viewMode = 'text'}
                    title="텍스트 형태로 보기"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                  </button>
                  <button 
                    class="inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-md transition-all duration-200 view-mode-tab"
                    class:active={viewMode === 'tree'}
                    on:click={() => viewMode = 'tree'}
                    title="트리 구조로 보기"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h12M4 14h8M4 18h4"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="flex-1 p-2 min-h-0 visualization-content">
              {#if viewMode === 'text'}
                {#if parseResult.isValid}
                  <pre class="code-editor bg-gray-50 border border-gray-200 rounded-lg p-3 h-full overflow-auto scrollbar-thin whitespace-pre-wrap">{JSON.stringify(parseResult.data, null, 2)}</pre>
                {:else}
                  <div class="h-full flex items-center justify-center text-gray-500">
                    유효한 JSON을 입력하면 포맷된 결과가 여기에 표시됩니다
                  </div>
                {/if}
              {:else if viewMode === 'tree'}
                {#if treeData.length > 0}
                  <div class="tree-container h-full overflow-auto scrollbar-thin">
                    <!-- 트리 컨트롤 -->
                    <div class="mb-2 flex gap-2 sticky top-0 bg-white z-10 pb-2 border-b border-gray-100">
                      <button 
                        class="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors"
                        on:click={expandAll}
                        title="모두 펼치기"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                      </button>
                      <button 
                        class="flex items-center justify-center w-8 h-8 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors"
                        on:click={collapseAll}
                        title="모두 접기"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>
                        </svg>
                      </button>
                    </div>
                    
                    <!-- 재귀적 트리 렌더링 -->
                    <div class="tree-content">
                      {#each treeData as node}
                        {#snippet TreeNode(treeNode: TreeNode, parentKey: string = '', depth: number = 0)}
                          {@const nodeKey = getNodeKey(treeNode, parentKey)}
                          {@const isExpanded = expandedNodes.has(nodeKey)}
                          {@const hasChildren = treeNode.children && treeNode.children.length > 0}
                          
                          <div class="tree-node-item" style="margin-left: {depth * 20}px">
                            <div class="tree-node cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-1 flex items-center gap-2"
                                 on:click={() => hasChildren && toggleNode(nodeKey)}
                                 on:keydown={(e) => e.key === 'Enter' && hasChildren && toggleNode(nodeKey)}
                                 role="button"
                                 tabindex="0">
                              
                              <!-- 확장/축소 아이콘 -->
                              {#if hasChildren}
                                <span class="tree-icon transition-transform duration-200 {isExpanded ? 'rotate-90' : ''}">
                                  ▶
                                </span>
                              {:else}
                                <span class="tree-icon w-3"></span>
                              {/if}
                              
                              <!-- 노드 내용 -->
                              <span class="tree-node-key">{treeNode.key}:</span>
                              <span class="tree-node-value tree-node-type-{treeNode.type}">
                                {#if treeNode.type === 'object'}
                                  Object ({treeNode.children?.length || 0})
                                {:else if treeNode.type === 'array'}
                                  Array ({treeNode.children?.length || 0})
                                {:else}
                                  {JSON.stringify(treeNode.value)}
                                {/if}
                              </span>
                            </div>
                            
                            <!-- 자식 노드들 -->
                            {#if hasChildren && isExpanded}
                              <div class="tree-children">
                                {#each treeNode.children as childNode}
                                  {@render TreeNode(childNode, nodeKey, depth + 1)}
                                {/each}
                              </div>
                            {/if}
                          </div>
                        {/snippet}
                        
                        {@render TreeNode(node)}
                      {/each}
                    </div>
                  </div>
                {:else}
                  <div class="h-full flex items-center justify-center text-gray-500">
                    유효한 JSON을 입력하면 트리 구조가 여기에 표시됩니다
                  </div>
                {/if}
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Right Sidebar - Status Information -->
    <div class="w-64 bg-white border-l border-gray-200 p-4 flex-shrink-0">
      <div class="space-y-4">
        <!-- 파일 정보 -->
        <div>
          <h3 class="text-base font-semibold text-gray-900 mb-3">파일 정보</h3>
          <div class="space-y-2">
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
              <span class="text-gray-600">크기</span>
              <span class="font-medium">{Math.round(stats.size / 1024)} KB</span>
            </div>
            <div class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
              <span class="text-gray-600">줄 수</span>
              <span class="font-medium">{stats.lines}</span>
            </div>
          </div>
        </div>
        
        <!-- 상태 -->
        <div>
          <h3 class="text-base font-semibold text-gray-900 mb-3">상태</h3>
          <div class="p-3 rounded-lg {stats.isValid ? 'bg-green-50 border border-green-200' : jsonText.trim() ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'}">
            {#if stats.isValid}
              <div class="flex items-center text-green-800">
                <span class="text-lg mr-2">✓</span>
                <div>
                  <div class="text-sm font-semibold">유효한 JSON</div>
                </div>
              </div>
            {:else if jsonText.trim()}
              <div class="flex items-center text-red-800">
                <span class="text-lg mr-2">✗</span>
                <div>
                  <div class="text-sm font-semibold">오류 {parseResult.errors.length}개</div>
                </div>
              </div>
            {:else}
              <div class="flex items-center text-yellow-800">
                <span class="text-lg mr-2">⏳</span>
                <div>
                  <div class="text-sm font-semibold">입력 대기</div>
                </div>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- 핵심 기능 -->
        <div>
          <h3 class="text-base font-semibold text-gray-900 mb-3">핵심 기능</h3>
          <div class="space-y-2">
            <div class="flex items-center p-2 bg-blue-50 rounded text-sm">
              <span class="text-blue-600 mr-2">⚡</span>
              <span class="text-blue-800 font-medium">실시간 검증</span>
            </div>
            <div class="flex items-center p-2 bg-orange-50 rounded text-sm">
              <span class="text-orange-600 mr-2">🔍</span>
              <span class="text-orange-800 font-medium">상세 오류 분석</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast 컴포넌트 -->
  {#if toasts.length > 0}
    <div class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2">
      {#each toasts as toast (toast.id)}
        <div 
          class="toast-notification bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 rounded-lg shadow-lg border flex items-center gap-3 min-w-80 cursor-pointer transform transition-all duration-300 ease-out"
          class:toast-success={toast.type === 'success'}
          class:toast-error={toast.type === 'error'}
          class:toast-info={toast.type === 'info'}
          class:toast-warning={toast.type === 'warning'}
          on:click={() => removeToast(toast.id)}
          on:keydown={(e) => e.key === 'Enter' && removeToast(toast.id)}
          role="button"
          tabindex="0"
        >
          <div class="flex-shrink-0">
            {#if toast.type === 'success'}
              <div class="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
            {:else if toast.type === 'error'}
              <div class="w-6 h-6 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
            {:else if toast.type === 'info'}
              <div class="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
            {:else if toast.type === 'warning'}
              <div class="w-6 h-6 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
            {/if}
          </div>
          
          <div class="flex-1">
            <p class="text-sm font-medium">{toast.message}</p>
          </div>
          
          <div class="flex-shrink-0">
            <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</main>

<style>
  :global([data-theme="dark"]) {
    background-color: #111827;
    color: #f9fafb;
  }
  
  :global([data-theme="dark"] .bg-white) {
    background-color: #1f2937;
  }
  
  :global([data-theme="dark"] .border-gray-200) {
    border-color: #374151;
  }
  
  :global([data-theme="dark"] .text-gray-900) {
    color: #f9fafb;
  }
  
  :global([data-theme="dark"] .text-gray-600) {
    color: #9ca3af;
  }
  
  :global([data-theme="dark"] .bg-gray-50) {
    background-color: #111827;
  }
  
  :global([data-theme="dark"] textarea) {
    background-color: #1f2937;
    border-color: #374151;
    color: #f9fafb;
  }

  /* Main Content Grid - 브라우저 높이 제한 */
  .main-content-grid {
    /* 헤더(64px) + 도구모음(약 80px) + 패딩(32px) 제외 */
    height: calc(100vh - 176px);
    max-height: calc(100vh - 176px);
    min-height: 0;
  }

  /* JSON 입력 카드 */
  .json-input-card {
    height: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* JSON 입력 콘텐츠 영역 */
  .json-input-content {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* 시각화 카드 */
  .visualization-card {
    height: 100%;
    max-height: 100%;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* 시각화 콘텐츠 영역 */
  .visualization-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  /* JSON Editor Container */
  .json-editor-container {
    position: relative;
    display: flex;
    align-items: stretch;
    height: 100%;
    min-height: 0;
  }

  /* Line Numbers Styling */
  .line-numbers {
    position: absolute;
    left: 0;
    top: 0;
    width: 50px;
    height: 100%; /* Use full height of container */
    background-color: #f8fafc;
    border: 1px solid #d1d5db;
    border-right: 2px solid #e5e7eb;
    border-radius: 0.5rem 0 0 0.5rem;
    overflow: hidden;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    user-select: none;
    pointer-events: none;
    z-index: 1;
    box-sizing: border-box;
    /* Exactly match textarea's padding */
    padding: 0.75rem 0 0.75rem 0;
  }

  .line-number {
    height: 1.3125rem; /* Exact line height: 0.875rem * 1.5 = 21px */
    padding: 0 0.5rem 0 0.25rem;
    text-align: right;
    color: #6b7280;
    font-size: 0.875rem;
    line-height: 1.5; /* Match textarea exactly */
    border-bottom: 1px solid transparent;
    box-sizing: border-box;
    display: block;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
  }

  .line-number.error-line {
    background-color: #fef2f2;
    color: #dc2626;
    border-bottom-color: #fecaca;
  }

  /* Textarea with line numbers */
  .json-editor-container textarea {
    padding-left: 60px !important; /* space for line numbers */
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    position: relative;
    z-index: 2;
    box-sizing: border-box;
    /* Ensure consistent padding with line numbers */
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    padding-right: 0.75rem;
    margin: 0;
    border: 1px solid #d1d5db;
    /* 높이 100%로 설정하여 부모 컨테이너에 맞춤 */
    height: 100%;
    min-height: 0;
  }

  /* Dark mode line numbers */
  :global([data-theme="dark"]) .line-numbers {
    background-color: #1f2937;
    border-color: #374151;
    border-right-color: #4b5563;
  }

  :global([data-theme="dark"]) .line-number {
    color: #9ca3af;
  }

  :global([data-theme="dark"]) .line-number.error-line {
    background-color: #7f1d1d;
    color: #fca5a5;
    border-bottom-color: #b91c1c;
  }

  /* Error Analysis Styles */
  .error-analysis-panel {
    animation: slideIn 0.3s ease-out;
    /* 더 정확한 높이 계산 - 헤더(64px) + 도구모음(약 80px) + 여백(40px) */
    max-height: calc(100vh - 184px);
    height: calc(100vh - 184px);
    display: flex;
    flex-direction: column;
  }

  .error-analysis-content {
    /* 패널 헤더(약 72px) 제외한 실제 스크롤 영역 */
    max-height: calc(100vh - 256px);
    overscroll-behavior: contain; /* 스크롤 경계에서 부모 스크롤 방지 */
    /* 스크롤이 정확한 타이밍에 나타나도록 flex 사용 */
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Error card 간격 최적화 */
  .error-card {
    transition: all 0.2s ease;
    margin-bottom: 1.5rem;
    /* 가로 오버플로우 방지 */
    overflow-x: hidden;
    word-wrap: break-word;
  }

  .error-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .error-card:last-child {
    margin-bottom: 0;
  }

  /* 오류 라인 표시 스타일 개선 */
  .error-line-display {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.75rem;
    background-color: #ffffff;
    padding: 0.5rem;
    border-radius: 0.25rem;
    border: 1px solid #d1d5db;
    margin-bottom: 0.5rem;
    /* 가로 스크롤 제거, 줄바꿈 활성화 */
    overflow-x: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-width: 100%;
  }

  /* 다크 모드 오류 라인 표시 */
  :global([data-theme="dark"]) .error-line-display {
    background-color: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  /* 압축된 버튼 스타일 */
  .action-button.primary.text-xs {
    padding: 0.25rem 0.5rem;
    font-size: 0.625rem;
    border-radius: 0.25rem;
  }

  /* 모바일 반응형 개선 */
  @media (max-width: 1024px) {
    .w-64 {
      display: none;
    }
    
    /* 메인 콘텐츠 그리드 높이 조정 */
    .main-content-grid {
      height: calc(100vh - 160px);
      max-height: calc(100vh - 160px);
    }
    
    /* 오류 분석 패널도 모바일에서 높이 조정 */
    .error-analysis-panel {
      max-height: calc(100vh - 140px);
      height: calc(100vh - 140px);
    }
    
    .error-analysis-content {
      max-height: calc(100vh - 212px);
    }
    
    /* 트리 컨테이너 높이 조정 */
    .tree-container {
      height: calc(100vh - 160px);
      max-height: calc(100vh - 160px);
      min-height: 300px;
    }
  }

  @media (max-width: 768px) {
    /* 메인 콘텐츠 그리드 높이 조정 */
    .main-content-grid {
      height: calc(100vh - 140px);
      max-height: calc(100vh - 140px);
    }
    
    .error-analysis-panel {
      max-height: calc(100vh - 120px);
      height: calc(100vh - 120px);
    }
    
    .error-analysis-content {
      max-height: calc(100vh - 192px);
    }
    
    /* 모바일에서 트리 컨테이너 높이 조정 */
    .tree-container {
      height: calc(100vh - 140px);
      max-height: calc(100vh - 140px);
      min-height: 250px;
    }
  }

  /* Right Sidebar */
  .w-64 {
    /* 헤더(64px) 제외하고 전체 높이 사용, 오버플로우 시 스크롤 */
    max-height: calc(100vh - 64px);
    overflow-y: auto;
    /* 스크롤바 스타일링 */
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
  }

  .w-64::-webkit-scrollbar {
    width: 6px;
  }

  .w-64::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  .w-64::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .w-64::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  :global([data-theme="dark"]) .w-64 {
    background-color: #1f2937;
    border-color: #374151;
    /* 다크 모드 스크롤바 */
    scrollbar-color: #4b5563 #1f2937;
  }

  :global([data-theme="dark"]) .w-64::-webkit-scrollbar-track {
    background: #1f2937;
  }

  :global([data-theme="dark"]) .w-64::-webkit-scrollbar-thumb {
    background: #4b5563;
  }

  :global([data-theme="dark"]) .w-64::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }

  /* Sidebar content styling */
  .w-64 h3 {
    color: #1f2937;
  }

  :global([data-theme="dark"]) .w-64 h3 {
    color: #f9fafb;
  }

  /* Status cards in sidebar */
  .w-64 .bg-gray-50 {
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
  }

  :global([data-theme="dark"]) .w-64 .bg-gray-50 {
    background-color: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  /* Status indicator styling */
  .w-64 .bg-green-50 {
    background-color: #f0fdf4;
    border-color: #bbf7d0;
  }

  .w-64 .bg-red-50 {
    background-color: #fef2f2;
    border-color: #fecaca;
  }

  .w-64 .bg-yellow-50 {
    background-color: #fefce8;
    border-color: #fde047;
  }

  :global([data-theme="dark"]) .w-64 .bg-green-50 {
    background-color: #14532d;
    border-color: #16a34a;
  }

  :global([data-theme="dark"]) .w-64 .bg-red-50 {
    background-color: #7f1d1d;
    border-color: #dc2626;
  }

  :global([data-theme="dark"]) .w-64 .bg-yellow-50 {
    background-color: #713f12;
    border-color: #d97706;
  }

  /* Feature cards in sidebar */
  .w-64 .bg-blue-50 {
    background-color: #eff6ff;
    border: 1px solid #bfdbfe;
  }

  .w-64 .bg-orange-50 {
    background-color: #fff7ed;
    border: 1px solid #fed7aa;
  }

  :global([data-theme="dark"]) .w-64 .bg-blue-50 {
    background-color: #1e3a8a;
    border-color: #3b82f6;
  }

  :global([data-theme="dark"]) .w-64 .bg-orange-50 {
    background-color: #9a3412;
    border-color: #ea580c;
  }

  .action-button {
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s ease;
    border: none;
    cursor: pointer;
  }

  .action-button.primary {
    background-color: #3b82f6;
    color: white;
  }

  .action-button.primary:hover {
    background-color: #2563eb;
    transform: translateY(-1px);
  }

  .action-button.success {
    background-color: #10b981;
    color: white;
  }

  .action-button.success:hover {
    background-color: #059669;
    transform: translateY(-1px);
  }

  .code-example {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.75rem;
    /* 가로 오버플로우 방지 */
    overflow-x: hidden;
    word-wrap: break-word;
  }

  .error-example {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    padding: 0.5rem;
    border-radius: 0.25rem;
    color: #991b1b;
    /* 가로 스크롤 제거, 줄바꿈 활성화 */
    overflow-x: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-width: 100%;
  }

  .correct-example {
    background-color: #f0fdf4;
    border: 1px solid #bbf7d0;
    padding: 0.5rem;
    border-radius: 0.25rem;
    color: #166534;
    /* 가로 스크롤 제거, 줄바꿈 활성화 */
    overflow-x: hidden;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-width: 100%;
  }

  /* 다크 모드 코드 예시 */
  :global([data-theme="dark"]) .error-example {
    background-color: #7f1d1d;
    border-color: #b91c1c;
    color: #fecaca;
  }

  :global([data-theme="dark"]) .correct-example {
    background-color: #14532d;
    border-color: #16a34a;
    color: #bbf7d0;
  }

  /* Status badges */
  .status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.success {
    background-color: #dcfce7;
    color: #166534;
  }

  .status-badge.error {
    background-color: #fef2f2;
    color: #dc2626;
  }

  .status-badge.pending {
    background-color: #fef3c7;
    color: #d97706;
  }

  /* Tree styling */
  .tree-node {
    padding: 0.125rem 0;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875rem;
    transition: background-color 0.2s ease;
  }

  .tree-node:hover {
    background-color: #f3f4f6;
  }

  .tree-node.cursor-pointer {
    cursor: pointer;
  }

  .tree-icon {
    display: inline-block;
    width: 12px;
    text-align: center;
    color: #6b7280;
    font-size: 0.75rem;
    user-select: none;
  }

  .tree-children {
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .tree-node-key {
    color: #7c3aed;
    font-weight: 600;
    margin-right: 0.25rem;
  }

  .tree-node-value {
    margin-left: 0.25rem;
  }

  /* 다크 모드 트리 스타일 */
  :global([data-theme="dark"]) .tree-node:hover {
    background-color: #374151;
  }

  :global([data-theme="dark"]) .tree-icon {
    color: #9ca3af;
  }

  :global([data-theme="dark"]) .tree-node-key {
    color: #a78bfa;
  }

  /* 트리 노드 타입별 색상 */
  .tree-node-type-string {
    color: #059669;
  }

  .tree-node-type-number {
    color: #dc2626;
  }

  .tree-node-type-boolean {
    color: #2563eb;
  }

  .tree-node-type-null {
    color: #6b7280;
  }

  .tree-node-type-object,
  .tree-node-type-array {
    color: #7c2d12;
    font-weight: 500;
  }

  /* 다크 모드 타입별 색상 */
  :global([data-theme="dark"]) .tree-node-type-string {
    color: #34d399;
  }

  :global([data-theme="dark"]) .tree-node-type-number {
    color: #f87171;
  }

  :global([data-theme="dark"]) .tree-node-type-boolean {
    color: #60a5fa;
  }

  :global([data-theme="dark"]) .tree-node-type-null {
    color: #9ca3af;
  }

  :global([data-theme="dark"]) .tree-node-type-object,
  :global([data-theme="dark"]) .tree-node-type-array {
    color: #fbbf24;
  }

  /* Code editor - 포맷된 JSON 영역 */
  .code-editor {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    /* 가로 스크롤 제거, 줄바꿈 활성화 */
    overflow-x: hidden;
    overflow-y: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
    max-width: 100%;
    /* 브라우저 높이에 맞춰 내부 스크롤 활성화 */
    height: 100%;
    max-height: 100%;
  }

  /* Scrollbar */
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Dark mode scrollbar */
  :global([data-theme="dark"]) .scrollbar-thin {
    scrollbar-color: #4b5563 #1f2937;
  }

  :global([data-theme="dark"]) .scrollbar-thin::-webkit-scrollbar-track {
    background: #1f2937;
  }

  :global([data-theme="dark"]) .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #4b5563;
  }

  :global([data-theme="dark"]) .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }

  /* Toolbar Button Styles */
  .toolbar-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
    border: 1px solid #d1d5db;
    background-color: #f9fafb;
    color: #374151;
    cursor: pointer;
    white-space: nowrap;
  }

  .toolbar-button:hover:not(:disabled) {
    background-color: #e5e7eb;
    border-color: #d1d5db;
    color: #1f2937;
  }

  .toolbar-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: #f3f4f6;
    border-color: #e5e7eb;
    color: #9ca3af;
  }

  .toolbar-button.primary {
    background-color: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .toolbar-button.primary:hover:not(:disabled) {
    background-color: #2563eb;
    border-color: #2563eb;
  }

  .toolbar-button.secondary {
    background-color: #f3f4f6;
    color: #4b5563;
    border-color: #d1d5db;
  }

  .toolbar-button.secondary:hover:not(:disabled) {
    background-color: #e5e7eb;
    border-color: #d1d5db;
    color: #1f2937;
  }

  .toolbar-button.success {
    background-color: #10b981;
    color: white;
    border-color: #10b981;
  }

  .toolbar-button.success:hover:not(:disabled) {
    background-color: #059669;
    border-color: #059669;
  }

  .toolbar-button.warning {
    background-color: #f59e0b;
    color: white;
    border-color: #f59e0b;
  }

  .toolbar-button.warning:hover:not(:disabled) {
    background-color: #d97706;
    border-color: #d97706;
  }

  .toolbar-button.info {
    background-color: #60a5fa;
    color: white;
    border-color: #60a5fa;
  }

  .toolbar-button.info:hover:not(:disabled) {
    background-color: #3b82f6;
    border-color: #3b82f6;
  }

  .toolbar-divider {
    width: 1px;
    height: 1.5rem;
    background-color: #e5e7eb;
    margin: 0 0.5rem;
  }

  .button-icon {
    font-size: 1rem;
  }

  /* Dark mode toolbar buttons */
  :global([data-theme="dark"]) .toolbar-button {
    background-color: #374151;
    color: #e5e7eb;
    border-color: #4b5563;
  }

  :global([data-theme="dark"]) .toolbar-button:hover:not(:disabled) {
    background-color: #4b5563;
    border-color: #6b7280;
    color: #f3f4f6;
  }

  :global([data-theme="dark"]) .toolbar-button:disabled {
    background-color: #1f2937;
    border-color: #374151;
    color: #6b7280;
  }

  :global([data-theme="dark"]) .toolbar-button.secondary {
    background-color: #1f2937;
    color: #9ca3af;
    border-color: #374151;
  }

  :global([data-theme="dark"]) .toolbar-button.secondary:hover:not(:disabled) {
    background-color: #374151;
    border-color: #4b5563;
    color: #e5e7eb;
  }

  :global([data-theme="dark"]) .toolbar-divider {
    background-color: #4b5563;
  }

  /* Note: Main responsive design styles are defined earlier with error panel adjustments */
  /*
  @media (max-width: 1024px) {
    .w-80 {
      display: none;
    }
  }
  */

  /* Full height layout */
  .h-screen {
    height: 100vh;
  }

  .flex-1 {
    flex: 1;
  }

  .min-h-0 {
    min-height: 0;
  }

  .flex-shrink-0 {
    flex-shrink: 0;
  }

  /* Tree styling */
  .tree-container {
    /* 컨테이너 높이 제한으로 내부 스크롤 활성화 - 더 정확한 계산 */
    height: 100%;
    max-height: 100%;
    min-height: 400px;
    overflow-y: auto;
    overflow-x: hidden;
    /* 스크롤바 스타일링 */
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 #f1f5f9;
  }

  .tree-container::-webkit-scrollbar {
    width: 6px;
  }

  .tree-container::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  .tree-container::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .tree-container::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  .tree-content {
    padding-bottom: 0.5rem;
  }

  /* 다크 모드 트리 컨테이너 */
  :global([data-theme="dark"]) .tree-container {
    scrollbar-color: #4b5563 #1f2937;
  }

  :global([data-theme="dark"]) .tree-container::-webkit-scrollbar-track {
    background: #1f2937;
  }

  :global([data-theme="dark"]) .tree-container::-webkit-scrollbar-thumb {
    background: #4b5563;
  }

  :global([data-theme="dark"]) .tree-container::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }

  /* 다크 모드 sticky 헤더 */
  :global([data-theme="dark"]) .mb-2.flex.gap-2.sticky {
    background-color: #1f2937;
    border-bottom-color: #374151;
  }

  /* Toast Notification Styles */
  .toast-notification {
    animation: slideInFromBottom 0.3s ease-out;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
  }

  .toast-notification:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  }

  .toast-success {
    border-color: #d1fae5;
    background-color: rgba(255, 255, 255, 0.95);
  }

  .toast-error {
    border-color: #fecaca;
    background-color: rgba(255, 255, 255, 0.95);
  }

  .toast-info {
    border-color: #bfdbfe;
    background-color: rgba(255, 255, 255, 0.95);
  }

  .toast-warning {
    border-color: #fde68a;
    background-color: rgba(255, 255, 255, 0.95);
  }

  /* 다크 모드 토스트 */
  :global([data-theme="dark"]) .toast-success {
    border-color: #065f46;
    background-color: rgba(31, 41, 55, 0.95);
  }

  :global([data-theme="dark"]) .toast-error {
    border-color: #7f1d1d;
    background-color: rgba(31, 41, 55, 0.95);
  }

  :global([data-theme="dark"]) .toast-info {
    border-color: #1e3a8a;
    background-color: rgba(31, 41, 55, 0.95);
  }

  :global([data-theme="dark"]) .toast-warning {
    border-color: #92400e;
    background-color: rgba(31, 41, 55, 0.95);
  }

  @keyframes slideInFromBottom {
    from {
      opacity: 0;
      transform: translateY(100px) translateX(-50%);
    }
    to {
      opacity: 1;
      transform: translateY(0) translateX(-50%);
    }
  }

  .toast-notification.removing {
    animation: slideOutToBottom 0.3s ease-in forwards;
  }

  @keyframes slideOutToBottom {
    from {
      opacity: 1;
      transform: translateY(0) translateX(-50%);
    }
    to {
      opacity: 0;
      transform: translateY(100px) translateX(-50%);
    }
  }

  /* View Mode Tab Styles */
  .view-mode-tab {
    color: #6b7280;
    background-color: transparent;
    border: none;
    cursor: pointer;
    position: relative;
  }

  .view-mode-tab:hover {
    color: #374151;
    background-color: rgba(255, 255, 255, 0.5);
  }

  .view-mode-tab.active {
    color: #2563eb;
    background-color: #ffffff;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  }

  .view-mode-tab.active:hover {
    color: #1d4ed8;
    background-color: #ffffff;
  }

  /* 다크 모드 뷰 모드 탭 */
  :global([data-theme="dark"]) .view-mode-tab {
    color: #9ca3af;
  }

  :global([data-theme="dark"]) .view-mode-tab:hover {
    color: #e5e7eb;
    background-color: rgba(55, 65, 81, 0.5);
  }

  :global([data-theme="dark"]) .view-mode-tab.active {
    color: #60a5fa;
    background-color: #374151;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px 0 rgba(0, 0, 0, 0.2);
  }

  :global([data-theme="dark"]) .view-mode-tab.active:hover {
    color: #3b82f6;
    background-color: #374151;
  }
</style>
