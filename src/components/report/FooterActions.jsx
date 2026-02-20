import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, Send, RotateCcw, Clock } from 'lucide-react';

export default function FooterActions({ lastSaved, onSave, onSubmit, onReset }) {
  const formatTime = (date) => {
    if (!date) return null;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="shadow-md">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {lastSaved ? (
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Last saved at {formatTime(lastSaved)}</span>
            </div>
          ) : (
            <div className="text-sm text-gray-300 italic">Not yet saved</div>
          )}
          <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-gray-500 border-gray-300 hover:bg-red-50 hover:text-red-500 hover:border-red-300"
            >
              <RotateCcw className="w-4 h-4 mr-1" /> Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              className="text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              <Save className="w-4 h-4 mr-1" /> Save Progress
            </Button>
            <Button
              size="sm"
              onClick={onSubmit}
              className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold"
            >
              <Send className="w-4 h-4 mr-1" /> Submit Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}