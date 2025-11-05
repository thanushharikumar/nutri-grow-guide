export interface SoilGridResponse {
  properties: {
    layers: Array<{
      name: string;
      depths: Array<{
        depth_interval: string;
        values: { mean: number | null; Q0_05?: number; Q0_95?: number };
      }>;
    }>;
  };
}

export interface SoilGridsData {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  pH: number;
  organicCarbon: number;
  soilType: 'sandy' | 'loamy' | 'clayey' | 'silty';
}

export class SoilGridsService {
  static async getSoilProperties(
    lat: number, 
    lon: number, 
    variables: string[] = ['nitrogen', 'phh2o', 'ocd', 'clay', 'sand']
  ): Promise<SoilGridResponse> {
    const url = `https://rest.isric.org/soilgrids/v2.0/properties/query`;
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
      property: variables.join(','),
      depth: '0-5cm',
      value: 'mean'
    });
    
    const resp = await fetch(`${url}?${params.toString()}`);
    if (!resp.ok) {
      throw new Error(`SoilGrids request failed: ${resp.status}`);
    }
    const data: SoilGridResponse = await resp.json();
    return data;
  }

  static mapToSoilData(rawData: SoilGridResponse): SoilGridsData {
    const layers = rawData.properties.layers;

    // Extract nitrogen (cg/kg) - convert to kg/ha
    const nitrogenLayer = layers.find(l => l.name === 'nitrogen');
    const nitrogen = nitrogenLayer?.depths.find(d => d.depth_interval === '0-5cm')?.values.mean ?? 200;
    
    // Extract pH (pH * 10)
    const phLayer = layers.find(l => l.name === 'phh2o');
    const phValue = phLayer?.depths.find(d => d.depth_interval === '0-5cm')?.values.mean ?? 65;
    const pH = phValue / 10;

    // Extract organic carbon (dg/kg) - convert to %
    const ocLayer = layers.find(l => l.name === 'ocd');
    const organicCarbon = (ocLayer?.depths.find(d => d.depth_interval === '0-5cm')?.values.mean ?? 10) / 10;

    // Extract clay percentage
    const clayLayer = layers.find(l => l.name === 'clay');
    const clayPercent = (clayLayer?.depths.find(d => d.depth_interval === '0-5cm')?.values.mean ?? 20) / 10;

    // Extract sand percentage
    const sandLayer = layers.find(l => l.name === 'sand');
    const sandPercent = (sandLayer?.depths.find(d => d.depth_interval === '0-5cm')?.values.mean ?? 40) / 10;

    // Determine soil type based on clay and sand percentages
    let soilType: 'sandy' | 'loamy' | 'clayey' | 'silty';
    if (clayPercent > 40) {
      soilType = 'clayey';
    } else if (sandPercent > 50) {
      soilType = 'sandy';
    } else if (sandPercent < 20 && clayPercent < 27) {
      soilType = 'silty';
    } else {
      soilType = 'loamy';
    }

    // Default values for P and K (SoilGrids doesn't provide these directly)
    // These would typically come from local soil testing
    const phosphorus = 15; // Default medium value
    const potassium = 150; // Default medium value

    return {
      nitrogen: Math.round(nitrogen),
      phosphorus,
      potassium,
      pH: Number(pH.toFixed(1)),
      organicCarbon: Number(organicCarbon.toFixed(2)),
      soilType
    };
  }

  static async getSoilData(lat: number, lon: number): Promise<SoilGridsData> {
    const rawData = await this.getSoilProperties(lat, lon);
    return this.mapToSoilData(rawData);
  }
}
