/**
 * Calendar Integration
 * Uses expo-calendar for native calendar events
 * 100% Free - native device feature
 */

import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

export interface DateEventDetails {
    title: string;
    location: string;
    startDate: Date;
    notes?: string;
    latitude?: number;
    longitude?: number;
}

/**
 * Request calendar permissions
 */
export async function requestCalendarPermission(): Promise<boolean> {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
}

/**
 * Get the default calendar ID for adding events
 */
async function getDefaultCalendarId(): Promise<string | null> {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    // Find a primary/default calendar
    const defaultCalendar = calendars.find(cal => {
        if (Platform.OS === 'ios') {
            return cal.allowsModifications && cal.source.name === 'iCloud';
        }
        return cal.accessLevel === Calendar.CalendarAccessLevel.OWNER;
    });

    // Fallback to first writable calendar
    const writableCalendar = calendars.find(cal => cal.allowsModifications);

    return defaultCalendar?.id || writableCalendar?.id || null;
}

/**
 * Add a date event to the calendar
 */
export async function addDateToCalendar(details: DateEventDetails): Promise<{
    success: boolean;
    eventId?: string;
    error?: string;
}> {
    try {
        // Request permission first
        const hasPermission = await requestCalendarPermission();
        if (!hasPermission) {
            return { success: false, error: 'Calendar permission denied' };
        }

        // Get calendar to add to
        const calendarId = await getDefaultCalendarId();
        if (!calendarId) {
            return { success: false, error: 'No writable calendar found' };
        }

        // Calculate end time (2 hours after start)
        const endDate = new Date(details.startDate);
        endDate.setHours(endDate.getHours() + 2);

        // Create the event
        const eventId = await Calendar.createEventAsync(calendarId, {
            title: `📍 ${details.title}`,
            location: details.location,
            startDate: details.startDate,
            endDate: endDate,
            notes: details.notes || 'Created by MeetPoint Protocol',
            alarms: [
                { relativeOffset: -60 }, // 1 hour before
                { relativeOffset: -15 }, // 15 minutes before
            ],
        });

        return { success: true, eventId };
    } catch (error) {
        console.error('Failed to add calendar event:', error);
        return { success: false, error: (error as Error).message };
    }
}
