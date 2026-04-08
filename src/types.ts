export interface JournalEntry {
  id: string;
  userId: string;
  date: string;
  content: string;
  tags: string[];
  mood?: string;
  imageUrl?: string;
  createdAt: number;
  updatedAt: number;
}

export type Mood = 'productive' | 'stuck' | 'learning' | 'neutral' | 'tired' | 'inspired';
