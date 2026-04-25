/**
 * Simple Search Component
 * 
 * Provides a basic search fallback when advanced search fails
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter } from 'lucide-react';
import { Button } from './ui/button';

interface SimpleSearchProps {
  onSearch: (query: string) => void;
}

export const SimpleSearch: React.FC<SimpleSearchProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <div className="space-y-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4 bg-card p-6 rounded-2xl border"
      >
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Search properties, locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
            />
          </div>
          
          <Button type="submit" size="lg">
            Search
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default SimpleSearch;