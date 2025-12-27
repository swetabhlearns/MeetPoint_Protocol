/**
 * Open-Meteo Weather API
 * 100% Free - No API key required, no rate limits
 * https://open-meteo.com/
 */

export interface WeatherData {
    temperature: number;
    weatherCode: WeatherCode;
    isRaining: boolean;
    description: string;
}

export type WeatherCode =
    | 'clear' | 'partly_cloudy' | 'cloudy'
    | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunderstorm';

// WMO Weather interpretation codes
const WEATHER_CODES: Record<number, { code: WeatherCode; description: string; isRaining: boolean }> = {
    0: { code: 'clear', description: 'Clear sky', isRaining: false },
    1: { code: 'partly_cloudy', description: 'Mainly clear', isRaining: false },
    2: { code: 'partly_cloudy', description: 'Partly cloudy', isRaining: false },
    3: { code: 'cloudy', description: 'Overcast', isRaining: false },
    45: { code: 'fog', description: 'Foggy', isRaining: false },
    48: { code: 'fog', description: 'Depositing rime fog', isRaining: false },
    51: { code: 'drizzle', description: 'Light drizzle', isRaining: true },
    53: { code: 'drizzle', description: 'Moderate drizzle', isRaining: true },
    55: { code: 'drizzle', description: 'Dense drizzle', isRaining: true },
    61: { code: 'rain', description: 'Slight rain', isRaining: true },
    63: { code: 'rain', description: 'Moderate rain', isRaining: true },
    65: { code: 'rain', description: 'Heavy rain', isRaining: true },
    71: { code: 'snow', description: 'Slight snow', isRaining: false },
    73: { code: 'snow', description: 'Moderate snow', isRaining: false },
    75: { code: 'snow', description: 'Heavy snow', isRaining: false },
    80: { code: 'rain', description: 'Slight rain showers', isRaining: true },
    81: { code: 'rain', description: 'Moderate rain showers', isRaining: true },
    82: { code: 'rain', description: 'Violent rain showers', isRaining: true },
    95: { code: 'thunderstorm', description: 'Thunderstorm', isRaining: true },
    96: { code: 'thunderstorm', description: 'Thunderstorm with hail', isRaining: true },
    99: { code: 'thunderstorm', description: 'Thunderstorm with heavy hail', isRaining: true },
};

/**
 * Get current weather for a location
 */
export async function getCurrentWeather(
    latitude: number,
    longitude: number
): Promise<WeatherData | null> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`;

        const response = await fetch(url);

        if (!response.ok) {
            console.error('Weather API error:', response.status);
            return null;
        }

        const data = await response.json();

        const weatherCode = data.current.weather_code as number;
        const weatherInfo = WEATHER_CODES[weatherCode] || {
            code: 'clear' as WeatherCode,
            description: 'Unknown',
            isRaining: false
        };

        return {
            temperature: Math.round(data.current.temperature_2m),
            weatherCode: weatherInfo.code,
            isRaining: weatherInfo.isRaining,
            description: weatherInfo.description,
        };
    } catch (error) {
        console.error('Failed to fetch weather:', error);
        return null;
    }
}

/**
 * Get weather emoji for display
 */
export function getWeatherEmoji(code: WeatherCode): string {
    const emojis: Record<WeatherCode, string> = {
        clear: '☀️',
        partly_cloudy: '⛅',
        cloudy: '☁️',
        fog: '🌫️',
        drizzle: '🌧️',
        rain: '🌧️',
        snow: '❄️',
        thunderstorm: '⛈️',
    };
    return emojis[code] || '🌤️';
}
