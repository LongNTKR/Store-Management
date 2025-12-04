/**
 * Normalize Vietnamese text by removing diacritics for matching
 */
function normalizeVietnamese(text: string): string {
  if (!text) return '';

  // Vietnamese diacritics mapping
  const vietnameseMap: Record<string, string> = {
    'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
    'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
    'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
    'đ': 'd',
    'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
    'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
    'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
    'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
    'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
    'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
    'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
    'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
    'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  };

  return text
    .toLowerCase()
    .split('')
    .map(char => vietnameseMap[char] || char)
    .join('');
}

/**
 * Find all matching positions for query in text (case and diacritic insensitive)
 */
function findMatches(text: string, query: string): Array<{ start: number; end: number }> {
  if (!text || !query) return [];

  const normalizedText = normalizeVietnamese(text);
  const normalizedQuery = normalizeVietnamese(query);
  const matches: Array<{ start: number; end: number }> = [];

  let startIndex = 0;
  while (true) {
    const index = normalizedText.indexOf(normalizedQuery, startIndex);
    if (index === -1) break;

    matches.push({
      start: index,
      end: index + query.length,
    });

    startIndex = index + 1;
  }

  return matches;
}

interface SearchHighlightProps {
  text: string;
  query: string;
  className?: string;
  highlightClassName?: string;
}

/**
 * Component to highlight matching text in search results
 * Supports Vietnamese diacritics - matches regardless of accents
 *
 * Example:
 *   query="bu" will highlight "bú" in "Bút bi đỏ"
 *   query="do" will highlight "đỏ" in "Bút bi đỏ"
 */
export function SearchHighlight({
  text,
  query,
  className = '',
  highlightClassName = 'bg-yellow-200 font-semibold'
}: SearchHighlightProps) {
  if (!query || !text) {
    return <span className={className}>{text}</span>;
  }

  const matches = findMatches(text, query);

  if (matches.length === 0) {
    return <span className={className}>{text}</span>;
  }

  // Build segments with highlights
  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let lastIndex = 0;

  matches.forEach(({ start, end }) => {
    // Add non-highlighted text before match
    if (start > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, start),
        highlighted: false,
      });
    }

    // Add highlighted match
    segments.push({
      text: text.slice(start, end),
      highlighted: true,
    });

    lastIndex = end;
  });

  // Add remaining text after last match
  if (lastIndex < text.length) {
    segments.push({
      text: text.slice(lastIndex),
      highlighted: false,
    });
  }

  return (
    <span className={className}>
      {segments.map((segment, index) =>
        segment.highlighted ? (
          <mark key={index} className={highlightClassName}>
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        )
      )}
    </span>
  );
}

export default SearchHighlight;
