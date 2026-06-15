import fs from 'fs';
import path from 'path';

const walk = (dir: string, callback: (path: string) => void) => {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
};

const replaceInFile = (filePath: string) => {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  let content = fs.readFileSync(filePath, 'utf8');

  // Colors & Aesthetic Replacements
  // First, convert custom brutalist colors to softer ones
  content = content.replace(/text-ink/g, 'text-slate-900');
  content = content.replace(/bg-ink/g, 'bg-slate-900');
  content = content.replace(/border-ink/g, 'border-slate-200');
  
  content = content.replace(/text-accent/g, 'text-blue-500');
  content = content.replace(/bg-accent/g, 'bg-blue-600');
  content = content.replace(/border-accent/g, 'border-blue-200');

  content = content.replace(/bg-surface/g, 'bg-white/60 backdrop-blur-3xl'); // slight glassmorphism/apple-like material
  
  content = content.replace(/#00FF55/g, '#10b981'); // emerald-500

  // Hard borders to soft rounded borders
  // border-4 border-ink -> border border-slate-200 shadow-sm rounded-3xl
  content = content.replace(/border-4 border-slate-200/g, 'border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50');
  content = content.replace(/border-4 border-black/g, 'border border-slate-200 rounded-[2rem] shadow-sm');
  
  // Quick fix for the other borders (already replaced ink -> slate-200)
  content = content.replace(/border-2 border-slate-200/g, 'border border-slate-200 rounded-2xl');
  content = content.replace(/border-2 border-black/g, 'border border-slate-200 rounded-2xl');
  
  content = content.replace(/border-b-4 border-slate-200/g, 'border-b border-slate-100');
  content = content.replace(/border-t-4 border-slate-200/g, 'border-t border-slate-100');
  content = content.replace(/border-l-4 border-slate-200/g, 'border-l border-slate-100');
  content = content.replace(/border-r-4 border-slate-200/g, 'border-r border-slate-100');

  // Hard shadows to Apple-like elegant shadows
  content = content.replace(/shadow-\[[^\]]+\]/g, (match) => {
    if (match.includes('inset')) return 'shadow-inner';
    if (match.includes('12px') || match.includes('16px') || match.includes('8px')) return 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]';
    if (match.includes('6px') || match.includes('4px') || match.includes('2px')) return 'shadow-[0_2px_10px_rgb(0,0,0,0.02)]';
    return 'shadow-sm';
  });
  
  // Specific brutalist hover effects to softer ones
  content = content.replace(/hover:translate-y-px/g, 'hover:-translate-y-0.5');
  
  // Typography Replacements (removing uppercase and harsh fonts)
  content = content.replace(/\bfont-display\b/g, 'font-semibold tracking-tight');
  content = content.replace(/\bfont-mono\b/g, 'font-medium');
  content = content.replace(/\buppercase\b/g, ''); // Apple uses normal case
  content = content.replace(/\btracking-widest\b/g, 'tracking-normal');
  content = content.replace(/\btracking-wider\b/g, 'tracking-normal');

  fs.writeFileSync(filePath, content);
};

walk('./pages', replaceInFile);
walk('./components', replaceInFile);
walk('./', (f) => {
    if (f === 'App.tsx' || f === 'index.tsx') replaceInFile(f);
});

console.log('Replacements complete');
