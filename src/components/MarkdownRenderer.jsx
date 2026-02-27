export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  const parseMarkdown = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let key = 0;

    const processInlineFormatting = (line) => {
      const parts = [];
      let currentText = line;
      let partKey = 0;

      const regex = /(\*\*.*?\*\*|\*.*?\*)/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(currentText)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <span key={`text-${partKey++}`}>
              {currentText.substring(lastIndex, match.index)}
            </span>
          );
        }

        const matchedText = match[0];
        if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
          parts.push(
            <strong key={`bold-${partKey++}`}>
              {matchedText.slice(2, -2)}
            </strong>
          );
        } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
          parts.push(
            <em key={`italic-${partKey++}`}>
              {matchedText.slice(1, -1)}
            </em>
          );
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < currentText.length) {
        parts.push(
          <span key={`text-${partKey++}`}>
            {currentText.substring(lastIndex)}
          </span>
        );
      }

      return parts.length > 0 ? parts : currentText;
    };

    lines.forEach((line, index) => {
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        const bulletText = line.trim().substring(1).trim();
        currentList.push(
          <li key={`li-${key++}`} style={{ marginBottom: '8px' }}>
            {processInlineFormatting(bulletText)}
          </li>
        );
      } else {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`ul-${key++}`} style={{
              marginBottom: '16px',
              paddingLeft: '24px',
              listStyleType: 'disc'
            }}>
              {currentList}
            </ul>
          );
          currentList = [];
        }

        if (line.trim()) {
          elements.push(
            <p key={`p-${key++}`} style={{ marginBottom: '12px', lineHeight: '1.7' }}>
              {processInlineFormatting(line)}
            </p>
          );
        } else if (elements.length > 0) {
          elements.push(<br key={`br-${key++}`} />);
        }
      }
    });

    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${key++}`} style={{
          marginBottom: '16px',
          paddingLeft: '24px',
          listStyleType: 'disc'
        }}>
          {currentList}
        </ul>
      );
    }

    return elements;
  };

  return <div style={{ fontSize: '15px', color: '#2d3748' }}>{parseMarkdown(content)}</div>;
}
