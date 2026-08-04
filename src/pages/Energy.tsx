import energyData from '../../data/energy.json';
import type { EnergyData } from '../types/energy';

const data: EnergyData = energyData;

// Home Assistant hands back raw sensor floats (gas arrives as
// "0.046997070313"). Show a precision that's readable at a glance instead.
function formatState(state: string): string {
  const value = Number(state);
  if (state.trim() === '' || !Number.isFinite(value)) return state;

  const magnitude = Math.abs(value);
  const decimals = magnitude >= 100 ? 0 : magnitude >= 10 ? 1 : 2;
  return value.toFixed(decimals);
}

export function Energy() {
  if (data.error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold mb-2">Error loading energy data</h2>
          <p className="text-gray-600">{data.error}</p>
        </div>
      </div>
    );
  }

  const sensorEntries = Object.entries(data.sensors);

  if (sensorEntries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8">
          <h2 className="text-xl font-bold mb-2">No energy data</h2>
          <p className="text-gray-600">Run 'npm run fetch-energy' to fetch data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-8">
      <h1 className="text-3xl font-bold mb-6">Energy</h1>
      <div className="grid grid-cols-2 gap-6">
        {sensorEntries.map(([entityId, sensor]) => (
          <div key={entityId} className="border-2 border-gray-300 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              {sensor.friendlyName}
            </h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold">{formatState(sensor.state)}</span>
              <span className="text-2xl text-gray-600">{sensor.unit}</span>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Updated: {new Date(sensor.lastUpdated).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
