/**
 * JSON을 XML로 변환
 */
export function jsonToXml(data: any, rootElement: string = 'root'): string {
  function toXml(obj: any, name: string = 'item'): string {
    if (obj === null || obj === undefined) {
      return `<${name}></${name}>`;
    }

    if (typeof obj === 'string') {
      return `<${name}>${escapeXml(obj)}</${name}>`;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return `<${name}>${obj}</${name}>`;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => toXml(item, 'item')).join('');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      const content = entries.map(([key, value]) => toXml(value, key)).join('');
      return `<${name}>${content}</${name}>`;
    }

    return `<${name}>${obj}</${name}>`;
  }

  function escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  const xmlContent = toXml(data, rootElement);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${xmlContent}`;
}

/**
 * JSON을 CSV로 변환 (평면화된 구조만 지원)
 */
export function jsonToCsv(data: any, includeHeaders: boolean = true): string {
  if (!Array.isArray(data)) {
    throw new Error('CSV 변환을 위해서는 배열 형태의 데이터가 필요합니다.');
  }

  if (data.length === 0) {
    return '';
  }

  // 모든 객체의 키를 수집하여 헤더 생성
  const allKeys = new Set<string>();
  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });

  const headers = Array.from(allKeys);
  const rows: string[] = [];

  // 헤더 추가
  if (includeHeaders) {
    rows.push(headers.map(escapeCsv).join(','));
  }

  // 데이터 행 추가
  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      const row = headers.map(header => {
        const value = item[header];
        return escapeCsv(formatCsvValue(value));
      });
      rows.push(row.join(','));
    } else {
      // 원시 타입인 경우
      rows.push(escapeCsv(String(item)));
    }
  });

  return rows.join('\n');
}

function formatCsvValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function escapeCsv(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * JSON을 YAML로 변환 (간단한 구현)
 */
export function jsonToYaml(data: any, indent: number = 2): string {
  function toYaml(obj: any, depth: number = 0): string {
    const indentStr = ' '.repeat(depth * indent);

    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj === 'string') {
      // 특수 문자가 있으면 따옴표로 감싸기
      if (obj.includes('\n') || obj.includes('"') || obj.includes("'")) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) {
        return '[]';
      }
      return '\n' + obj.map(item => 
        `${indentStr}- ${toYaml(item, depth + 1)}`
      ).join('\n');
    }

    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) {
        return '{}';
      }
      return '\n' + entries.map(([key, value]) => {
        const yamlValue = toYaml(value, depth + 1);
        if (yamlValue.startsWith('\n')) {
          return `${indentStr}${key}:${yamlValue}`;
        } else {
          return `${indentStr}${key}: ${yamlValue}`;
        }
      }).join('\n');
    }

    return String(obj);
  }

  const result = toYaml(data);
  return result.startsWith('\n') ? result.slice(1) : result;
}

/**
 * JSON을 HTML 테이블로 변환
 */
export function jsonToHtmlTable(data: any): string {
  if (!Array.isArray(data)) {
    throw new Error('HTML 테이블 변환을 위해서는 배열 형태의 데이터가 필요합니다.');
  }

  if (data.length === 0) {
    return '<table><tbody><tr><td>데이터가 없습니다.</td></tr></tbody></table>';
  }

  // 헤더 추출
  const allKeys = new Set<string>();
  data.forEach(item => {
    if (typeof item === 'object' && item !== null) {
      Object.keys(item).forEach(key => allKeys.add(key));
    }
  });

  const headers = Array.from(allKeys);

  let html = '<table>';
  
  // 헤더 생성
  if (headers.length > 0) {
    html += '<thead><tr>';
    headers.forEach(header => {
      html += `<th>${escapeHtml(header)}</th>`;
    });
    html += '</tr></thead>';
  }

  // 바디 생성
  html += '<tbody>';
  data.forEach(item => {
    html += '<tr>';
    if (typeof item === 'object' && item !== null) {
      headers.forEach(header => {
        const value = item[header];
        html += `<td>${escapeHtml(formatHtmlValue(value))}</td>`;
      });
    } else {
      html += `<td>${escapeHtml(String(item))}</td>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table>';

  return html;
}

function formatHtmlValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
} 