import Prism from 'prismjs';

// Import essential languages for Prism
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-shell-session';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-docker';

const ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  golang: 'go',
  cs: 'csharp',
  dockerfile: 'docker',
};

export function highlightCode(code: string, language: string = ''): string {
  const normalized = (language || '').toLowerCase().trim();
  const langKey = ALIASES[normalized] || normalized;

  if (langKey && Prism.languages[langKey]) {
    try {
      return Prism.highlight(code, Prism.languages[langKey], langKey);
    } catch {
      // Fallback to escape
    }
  }

  // Safe escape if language not found
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
