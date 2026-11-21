import { memo, useId, useMemo } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const plugins = [remarkGfm];
const markdownComponents: Components = {
  h1: 'h2',
  h3: 'h4',
  h4: 'h5',
  h5: 'h6',
  table: ({ children }) => (
    <div className="reply-table" role="region" aria-label="回复中的表格" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
  th: ({ children, style }) => (
    <th scope="col" style={style}>
      {children}
    </th>
  ),
  img: ({ alt }) => alt ?? null,
};

export default memo(function ReplyMarkdown({ content }: { content: string }) {
  const id = useId();
  const footnoteLabelId = `${id}-footnote-label`;
  const components = useMemo<Components>(
    () => ({
      ...markdownComponents,
      h2: ({ children, className, id: headingId }) => (
        <h3 className={className} id={headingId === 'footnote-label' ? footnoteLabelId : headingId}>
          {children}
        </h3>
      ),
      a: ({ href, id: linkId, children, 'aria-describedby': description }) => {
        if (href?.startsWith('#')) {
          return (
            <a
              href={href}
              id={linkId}
              aria-describedby={description === 'footnote-label' ? footnoteLabelId : description}
            >
              {children}
            </a>
          );
        }
        if (!href || !/^https?:\/\//i.test(href)) return children;
        return (
          <a href={href} target="_blank" rel="noreferrer">
            {children}
          </a>
        );
      },
    }),
    [footnoteLabelId],
  );

  return (
    <div className="reply-markdown">
      <Markdown
        skipHtml
        remarkPlugins={plugins}
        remarkRehypeOptions={{
          clobberPrefix: `${id}-`,
          footnoteLabel: '脚注',
          footnoteBackLabel: '返回正文',
        }}
        components={components}
      >
        {content}
      </Markdown>
    </div>
  );
});
