import { Venue } from '@/services/hybridVenues';
import { supabase } from '@/utils/supabase';

export interface DateRecord {
    id: string;
    venue_details: Venue;
    meetup_time: string;
    status: string;
}

export async function createDate(venue: Venue, meetupTime: Date): Promise<DateRecord | null> {
    try {
        const { data, error } = await supabase
            .from('dates')
            .insert([
                {
                    venue_details: venue,
                    meetup_time: meetupTime.toISOString(),
                    status: 'confirmed',
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Error creating date:', error);
            return null;
        }

        return data;
    } catch (err) {
        console.error('Unexpected error creating date:', err);
        return null;
    }
}
