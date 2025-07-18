import type { TreeNode } from '../types';

/**
 * 고유 ID 생성
 */
function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

/**
 * JSON Path 생성
 */
function createPath(parentPath: string, key: string, isArray: boolean = false): string {
  if (!parentPath) return '$';
  
  if (isArray) {
    return `${parentPath}[${key}]`;
  } else {
    // 키가 유효한 식별자인지 확인
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      return `${parentPath}.${key}`;
    } else {
      return `${parentPath}["${key}"]`;
    }
  }
}

/**
 * 데이터 타입 확인
 */
function getValueType(value: any): TreeNode['type'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'string'; // fallback
}

/**
 * 값을 문자열로 변환 (표시용)
 */
function valueToString(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `Array(${value.length})`;
    } else {
      const keys = Object.keys(value);
      return `Object(${keys.length})`;
    }
  }
  return String(value);
}

/**
 * 재귀적으로 트리 노드 생성
 */
function createTreeNode(
  key: string,
  value: any,
  parentPath: string = '',
  depth: number = 0,
  isArrayElement: boolean = false
): TreeNode {
  const nodeId = generateId();
  const path = createPath(parentPath, key, isArrayElement);
  const type = getValueType(value);
  
  const node: TreeNode = {
    id: nodeId,
    key,
    value: type === 'object' || type === 'array' ? null : value,
    type,
    path,
    children: [],
    expanded: depth < 3, // 기본적으로 3레벨까지 확장
    depth
  };

  // 객체나 배열인 경우 자식 노드 생성
  if (type === 'object' && value && typeof value === 'object') {
    const keys = Object.keys(value);
    node.children = keys.map(childKey => 
      createTreeNode(childKey, value[childKey], path, depth + 1, false)
    );
  } else if (type === 'array' && Array.isArray(value)) {
    node.children = value.map((item, index) => 
      createTreeNode(String(index), item, path, depth + 1, true)
    );
  }

  return node;
}

/**
 * JSON 데이터를 트리 구조로 변환
 */
export function generateTree(data: any): TreeNode[] {
  if (data === null || data === undefined) {
    return [{
      id: generateId(),
      key: 'root',
      value: data,
      type: 'null',
      path: '$',
      children: [],
      expanded: true,
      depth: 0
    }];
  }

  if (Array.isArray(data)) {
    return [{
      id: generateId(),
      key: 'root',
      value: null,
      type: 'array',
      path: '$',
      children: data.map((item, index) => 
        createTreeNode(String(index), item, '$', 1, true)
      ),
      expanded: true,
      depth: 0
    }];
  }

  if (typeof data === 'object') {
    const keys = Object.keys(data);
    return [{
      id: generateId(),
      key: 'root',
      value: null,
      type: 'object',
      path: '$',
      children: keys.map(key => 
        createTreeNode(key, data[key], '$', 1, false)
      ),
      expanded: true,
      depth: 0
    }];
  }

  // 원시 타입인 경우
  return [{
    id: generateId(),
    key: 'root',
    value: data,
    type: getValueType(data),
    path: '$',
    children: [],
    expanded: true,
    depth: 0
  }];
}

/**
 * 트리 노드를 재귀적으로 검색
 */
export function searchTree(nodes: TreeNode[], query: string, caseSensitive: boolean = false): TreeNode[] {
  const results: TreeNode[] = [];
  const searchQuery = caseSensitive ? query : query.toLowerCase();

  function searchNode(node: TreeNode) {
    const nodeKey = caseSensitive ? node.key : node.key.toLowerCase();
    const nodeValue = caseSensitive ? 
      valueToString(node.value) : 
      valueToString(node.value).toLowerCase();

    // 키나 값에 검색어가 포함되어 있는지 확인
    if (nodeKey.includes(searchQuery) || nodeValue.includes(searchQuery)) {
      results.push(node);
    }

    // 자식 노드들도 검색
    node.children.forEach(searchNode);
  }

  nodes.forEach(searchNode);
  return results;
}

/**
 * 특정 경로의 노드 찾기
 */
export function findNodeByPath(nodes: TreeNode[], path: string): TreeNode | null {
  function searchNode(node: TreeNode): TreeNode | null {
    if (node.path === path) {
      return node;
    }

    for (const child of node.children) {
      const result = searchNode(child);
      if (result) return result;
    }

    return null;
  }

  for (const node of nodes) {
    const result = searchNode(node);
    if (result) return result;
  }

  return null;
}

/**
 * 노드 확장/축소 토글
 */
export function toggleNodeExpansion(node: TreeNode): TreeNode {
  return {
    ...node,
    expanded: !node.expanded
  };
}

/**
 * 모든 노드 확장/축소
 */
export function toggleAllNodes(nodes: TreeNode[], expanded: boolean): TreeNode[] {
  function updateNode(node: TreeNode): TreeNode {
    return {
      ...node,
      expanded,
      children: node.children.map(updateNode)
    };
  }

  return nodes.map(updateNode);
}

/**
 * 트리 통계 정보 계산
 */
export function getTreeStats(nodes: TreeNode[]) {
  let totalNodes = 0;
  let maxDepth = 0;
  const typeCounts: Record<string, number> = {};

  function analyzeNode(node: TreeNode) {
    totalNodes++;
    maxDepth = Math.max(maxDepth, node.depth);
    
    typeCounts[node.type] = (typeCounts[node.type] || 0) + 1;
    
    node.children.forEach(analyzeNode);
  }

  nodes.forEach(analyzeNode);

  return {
    totalNodes,
    maxDepth,
    typeCounts,
    leafNodes: totalNodes - nodes.filter(node => node.children.length > 0).length
  };
} 