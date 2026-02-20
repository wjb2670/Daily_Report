import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Zap } from 'lucide-react';

export default function UtilitiesCard({ formData, setFormData }) {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="w-5 h-5 text-[#1e3a8a]" />
          Utilities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="utilities_installed">Utilities Installed</Label>
          <Textarea
            id="utilities_installed"
            placeholder="Describe utilities installed today..."
            value={formData.utilities_installed}
            onChange={e => setFormData(prev => ({ ...prev, utilities_installed: e.target.value }))}
            rows={3}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="utilities_removed">Utilities Removed</Label>
          <Textarea
            id="utilities_removed"
            placeholder="Describe utilities removed today..."
            value={formData.utilities_removed}
            onChange={e => setFormData(prev => ({ ...prev, utilities_removed: e.target.value }))}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}