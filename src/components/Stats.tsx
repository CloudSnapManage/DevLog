import React from 'react';
import { JournalEntry } from '../types';
import { Card } from './UI';
import { BarChart3, TrendingUp, Hash, Calendar } from 'lucide-react';

interface StatsProps {
  entries: JournalEntry[];
}

export const Stats = ({ entries }: StatsProps) => {
  const totalLogs = entries.length;
  
  const tagCounts: Record<string, number> = {};
  entries.forEach(entry => {
    entry.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full overflow-auto">
      <div className="flex items-center gap-3 mb-8">
        <BarChart3 className="text-blue-500" size={24} />
        <h2 className="text-xl md:text-2xl font-bold">Your Progress</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-12">
        <Card className="p-6 flex flex-col items-center text-center">
          <Calendar className="text-zinc-500 mb-2" size={20} />
          <span className="text-3xl font-bold mb-1">{totalLogs}</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Total Logs</span>
        </Card>
        <Card className="p-6 flex flex-col items-center text-center">
          <TrendingUp className="text-emerald-500 mb-2" size={20} />
          <span className="text-3xl font-bold mb-1">12</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Day Streak</span>
        </Card>
        <Card className="p-6 flex flex-col items-center text-center">
          <Hash className="text-amber-500 mb-2" size={20} />
          <span className="text-3xl font-bold mb-1">{Object.keys(tagCounts).length}</span>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">Unique Tags</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Top Topics</h3>
          <div className="space-y-3">
            {topTags.length === 0 ? (
              <p className="text-sm text-zinc-600 italic">No tags yet. Keep journaling!</p>
            ) : (
              topTags.map(([tag, count]) => (
                <div key={tag} className="flex items-center gap-4">
                  <span className="w-20 text-xs font-mono text-zinc-400">#{tag}</span>
                  <div className="flex-1 h-2 bg-zinc-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${(count / totalLogs) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-zinc-300">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4">Focus Areas</h3>
          <Card className="p-6 bg-zinc-900/30 border-dashed border-zinc-800">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Keep journaling to see your progress trends and focus areas here.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
