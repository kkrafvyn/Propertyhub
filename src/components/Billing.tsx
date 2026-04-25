import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CreditCard } from 'lucide-react';
import { User } from '../types';

interface BillingProps {
  user: User;
}

export function Billing({ user }: BillingProps) {
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
                <CreditCard className="w-16 h-16 text-primary" />
              </div>
              <CardTitle>Billing & Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Comprehensive billing management coming soon!
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}