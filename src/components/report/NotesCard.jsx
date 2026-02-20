import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { FileText } from 'lucide-react';

export default function NotesCard({ formData, setFormData }) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-[#1e3a8a]" />
          General Notes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Add any additional notes, observations, or issues for the day..."
          value={formData.notes}
          onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={5}
        />
      </CardContent>
    </Card>
  );
}