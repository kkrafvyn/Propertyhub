import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { HelpCircle } from 'lucide-react';
import { User } from '../types';

interface HelpProps {
  currentUser: User;
}

export function Help({ currentUser }: HelpProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <HelpCircle className="w-16 h-16 text-primary" />
              </div>
              <CardTitle>Help & Support</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Comprehensive help center and support system coming soon!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}