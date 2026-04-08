import React from 'react';
import { FileText, Bug, Target, Zap } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  icon: React.ReactNode;
  content: string;
}

export const TEMPLATES: Template[] = [
  {
    id: 'daily',
    name: 'Daily Standup',
    icon: <Zap size={16} />,
    content: "# Daily Standup\n\n### Yesterday\n- \n\n### Today\n- \n\n### Blockers\n- "
  },
  {
    id: 'bug',
    name: 'Bug Post-Mortem',
    icon: <Bug size={16} />,
    content: "# Bug Post-Mortem\n\n**Issue:** \n**Root Cause:** \n**Solution:** \n**Lessons Learned:** "
  },
  {
    id: 'learning',
    name: 'Learning Log',
    icon: <Target size={16} />,
    content: "# Learning Log\n\n**Topic:** \n**Key Takeaways:** \n- \n\n**How to Apply:** "
  }
];

interface TemplatePickerProps {
  onSelect: (content: string) => void;
}

export const TemplatePicker = ({ onSelect }: TemplatePickerProps) => {
  return (
    <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
      {TEMPLATES.map(template => (
        <button
          key={template.id}
          onClick={() => onSelect(template.content)}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-all shrink-0"
        >
          {template.icon}
          {template.name}
        </button>
      ))}
    </div>
  );
};
