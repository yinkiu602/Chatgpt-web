import React from "react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { a11yDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const Markdown = ({ content }) => {
    // Reference: https://github.com/remarkjs/react-markdown/issues/785
    const preprocessLaTeX = (content) => {
        // Replace block-level LaTeX delimiters \[ \] with $$ $$
        const blockProcessedContent = content.replace(
            /\\\[(.*?)\\\]/gs,
            (_, equation) => `$$${equation}$$`,
        );
        // Replace inline LaTeX delimiters \( \) with $ $
        const inlineProcessedContent = blockProcessedContent.replace(
            /\\\((.*?)\\\)/gs,
            (_, equation) => `$${equation}$`,
        );
        return inlineProcessedContent;
    };

    return (
        <ReactMarkdown
            children={preprocessLaTeX(content)}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
                code(props) {
                    const { children, className, node, ...rest } = props
                    const match = /language-(\w+)/.exec(className || '')
                    return match ? (
                        <SyntaxHighlighter
                            {...rest}
                            PreTag="div"
                            children={String(children).replace(/\n$/, '')}
                            language={match[1]}
                            style={a11yDark}
                            customStyle={{ fontSize: "small", marginLeft: "auto", marginRight: "auto", width: "80%" }}
                            wrapLongLines={true}
                        />
                    ) : (
                        <code {...rest} className={className}>
                            {children}
                        </code>
                    )
                }
            }}
        />
    );
};

export default Markdown;