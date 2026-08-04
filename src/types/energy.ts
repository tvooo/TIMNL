export interface EnergySensor {
  state: string;
  unit: string;
  friendlyName: string;
  lastUpdated: string;
}

export interface EnergyData {
  fetchedAt: string;
  sensors: {
    [key: string]: EnergySensor;
  };
  error?: string;
}
