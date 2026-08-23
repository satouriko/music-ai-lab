/* eslint-disable @next/next/no-img-element */

import { CodeViewer } from '@/components/code-viewer';
import { MarkdownContent } from '@/components/markdown-content';
import type {
  NotebookDocument,
  NotebookOutput,
} from '@/lib/content-types';

function NotebookOutputView({ output }: { output: NotebookOutput }) {
  if (output.kind === 'text') {
    return <pre className="notebook-text-output">{output.text}</pre>;
  }
  if (output.kind === 'error') {
    return (
      <div className="notebook-error-output">
        <strong>{output.name}: {output.value}</strong>
        <pre>{output.traceback}</pre>
      </div>
    );
  }
  if (output.kind === 'image') {
    return (
      <div className="notebook-image-output">
        <img
          alt="Notebook 保存的输出图像"
          src={`data:${output.mimeType};base64,${output.data}`}
        />
      </div>
    );
  }
  return (
    <p className="notebook-unsupported-output">
      未展示输出：{output.mimeTypes.join(', ') || '未知格式'}
    </p>
  );
}

export function NotebookViewer({ notebook }: { notebook: NotebookDocument }) {
  return (
    <div className="notebook-viewer">
      {notebook.cells.map((cell, index) => (
        <section className={`notebook-cell ${cell.kind}-cell`} key={index}>
          <header>
            <span>{cell.kind.toUpperCase()}</span>
            {cell.kind === 'code' && (
              <span>[{cell.executionCount ?? ' '}]:</span>
            )}
          </header>
          {cell.kind === 'markdown' && (
            <MarkdownContent source={cell.source} sourcePath={notebook.path} />
          )}
          {cell.kind === 'code' && (
            <CodeViewer language="python" source={cell.source} />
          )}
          {cell.kind === 'raw' && <pre className="raw-cell">{cell.source}</pre>}
          {cell.outputs.length > 0 && (
            <div className="notebook-outputs">
              {cell.outputs.map((output, outputIndex) => (
                <NotebookOutputView key={outputIndex} output={output} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
