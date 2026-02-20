import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CloudSun, Thermometer, Wind, Droplets, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function WeatherCard({ zipCode }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!zipCode || zipCode.length < 5) {
      setWeather(null);
      setError(null);
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Get the current weather conditions for ZIP code ${zipCode} in the United States. Return a JSON with: temperature_f (number), condition (short string like "Partly Cloudy"), humidity_percent (number), wind_mph (number), and city (string).`,
          add_context_from_internet: true,
          response_json_schema: {
            type: 'object',
            properties: {
              temperature_f: { type: 'number' },
              condition: { type: 'string' },
              humidity_percent: { type: 'number' },
              wind_mph: { type: 'number' },
              city: { type: 'string' },
            },
          },
        });
        setWeather(result);
      } catch (e) {
        setError('Could not fetch weather data.');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [zipCode]);

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CloudSun className="w-5 h-5 text-[#1e3a8a]" />
          Weather Conditions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!zipCode || zipCode.length < 5 ? (
          <p className="text-gray-400 text-sm italic">Enter a ZIP code in the report header to see weather data.</p>
        ) : loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Fetching weather...</span>
          </div>
        ) : error ? (
          <p className="text-red-500 text-sm">{error}</p>
        ) : weather ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col items-center bg-blue-50 rounded-lg p-3">
              <Thermometer className="w-5 h-5 text-red-400 mb-1" />
              <span className="text-2xl font-bold text-gray-800">{weather.temperature_f}°F</span>
              <span className="text-xs text-gray-500">Temperature</span>
            </div>
            <div className="flex flex-col items-center bg-blue-50 rounded-lg p-3">
              <CloudSun className="w-5 h-5 text-yellow-400 mb-1" />
              <span className="text-sm font-semibold text-gray-800 text-center">{weather.condition}</span>
              <span className="text-xs text-gray-500">Condition</span>
            </div>
            <div className="flex flex-col items-center bg-blue-50 rounded-lg p-3">
              <Droplets className="w-5 h-5 text-blue-400 mb-1" />
              <span className="text-2xl font-bold text-gray-800">{weather.humidity_percent}%</span>
              <span className="text-xs text-gray-500">Humidity</span>
            </div>
            <div className="flex flex-col items-center bg-blue-50 rounded-lg p-3">
              <Wind className="w-5 h-5 text-gray-400 mb-1" />
              <span className="text-2xl font-bold text-gray-800">{weather.wind_mph}</span>
              <span className="text-xs text-gray-500">Wind (mph)</span>
            </div>
            {weather.city && (
              <p className="col-span-2 sm:col-span-4 text-xs text-gray-400 text-center mt-1">📍 {weather.city}</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}