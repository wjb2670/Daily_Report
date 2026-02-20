import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ClipboardList } from 'lucide-react';

export default function ReportHeader({ formData, setFormData }) {
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="w-5 h-5 text-yellow-500" />
          Report Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="project">Project Name</Label>
            <Input
              id="project"
              placeholder="Enter project name"
              value={formData.project}
              onChange={e => handleChange('project', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="job_number">Job Number</Label>
            <Input
              id="job_number"
              placeholder="Enter job number"
              value={formData.job_number}
              onChange={e => handleChange('job_number', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="superintendent">Superintendent</Label>
            <Input
              id="superintendent"
              placeholder="Enter superintendent name"
              value={formData.superintendent}
              onChange={e => handleChange('superintendent', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="report_date">Report Date</Label>
            <Input
              id="report_date"
              type="date"
              value={formData.report_date}
              onChange={e => handleChange('report_date', e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="zip_code">Job Site ZIP Code</Label>
            <Input
              id="zip_code"
              placeholder="Enter ZIP code for weather"
              value={formData.zip_code}
              onChange={e => handleChange('zip_code', e.target.value)}
              maxLength={5}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}