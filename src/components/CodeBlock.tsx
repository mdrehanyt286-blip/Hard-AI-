import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-6 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl bg-[#0d0d14] max-w-full">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-800">
        <div className="flex items-center gap-2">
           <div className="flex gap-1.5 mr-2">
             <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
             <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
             <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
           </div>
           <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider font-bold">{language || 'code'}</span>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-gray-400 hover:text-white transition-all border border-gray-700/50"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-green-500" />
              <span className="text-green-500">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
        <SyntaxHighlighter
          language={language}
          style={atomDark}
          customStyle={{
            margin: 0,
            padding: '1.25rem',
            fontSize: 'max(13px, 0.875rem)',
            backgroundColor: 'transparent',
            lineHeight: '1.6',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'inherit',
            }
          }}
          wrapLongLines={false}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
