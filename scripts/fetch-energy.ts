import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface HomeAssistantState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

interface EnergyData {
  fetchedAt: string;
  sensors: {
    [key: string]: {
      state: string;
      unit: string;
      friendlyName: string;
      lastUpdated: string;
    };
  };
  error?: string;
}

async function fetchEnergy() {
  try {
    const baseUrl = process.env.HA_BASE_URL;
    const token = process.env.HA_TOKEN;

    if (!baseUrl || !token) {
      throw new Error('Missing Home Assistant credentials in .env file (HA_BASE_URL, HA_TOKEN)');
    }

    // Define which sensors to fetch
    // Customize this array with your actual sensor entity IDs
    const sensorIds = [
      "sensor.energy_consumed_today",
      "sensor.gas_consumed_today",
      // "sensor.grid_export",
      // "sensor.battery_level",
      // Add your sensor entity IDs here
    ];

    console.log('Connecting to Home Assistant...');
    console.log(`Base URL: ${baseUrl}`);

    const sensors: EnergyData['sensors'] = {};

    // Fetch each sensor
    for (const entityId of sensorIds) {
      try {
        console.log(`Fetching ${entityId}...`);
        const response = await fetch(`${baseUrl}/api/states/${entityId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.warn(`Failed to fetch ${entityId}: ${response.status}`);
          continue;
        }

        const data: HomeAssistantState = await response.json();

        sensors[entityId] = {
          state: data.state,
          unit: data.attributes.unit_of_measurement || '',
          friendlyName: data.attributes.friendly_name || entityId,
          lastUpdated: data.last_updated,
        };

        console.log(`✓ ${entityId}: ${data.state} ${data.attributes.unit_of_measurement || ''}`);
      } catch (error) {
        console.warn(`Error fetching ${entityId}:`, error);
      }
    }

    const output: EnergyData = {
      fetchedAt: new Date().toISOString(),
      sensors,
    };

    const outputPath = path.join(process.cwd(), 'data/energy.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

    console.log(`\nSuccessfully fetched ${Object.keys(sensors).length} sensor(s)`);
    console.log(`Data saved to ${outputPath}`);
  } catch (error) {
    console.error('Error fetching energy data:', (error as Error).message);

    const errorOutput: EnergyData = {
      fetchedAt: new Date().toISOString(),
      sensors: {},
      error: (error as Error).message,
    };

    const outputPath = path.join(process.cwd(), 'data/energy.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(errorOutput, null, 2));

    process.exit(1);
  }
}

fetchEnergy();
