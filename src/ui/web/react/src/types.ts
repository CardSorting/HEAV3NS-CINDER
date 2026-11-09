/** [LAYER: UI] */
export type Page = 'home' | 'discover' | 'matches' | 'pods' | 'agenda' | 'activity' | 'profile';
export interface Attendee { id: string; name: string; title: string; company: string; avatar: string; bio: string; interests: string[]; expertise: string[]; projects: string; challenges: string; looking_for: string; topics: string[]; checked_in_at: string }
export interface Candidate { profile: Attendee; explanation: { headline: string; sharedInterests: string[]; complementaryStrengths: string[]; synergySummary: string; scorePercent: number } }
export interface Feed { candidates: Candidate[]; totalFound: number }
export interface Message { id: string; senderId: string; senderName: string; senderType?: 'attendee' | 'facilitator' | 'system'; content: string; timestamp: string; pinned?: boolean }
export interface Match { match: { id: string; explanation: string; createdAt: string }; partner: Attendee | null; sharedPodId: string | null; sharedPodName: string | null; messages: Message[] }
export interface Pod { id: string; name: string; topic: string; memberIds: string[]; messages: Message[]; pinnedMeetup: { location: string; time: string; confirmed: boolean; rsvps?: string[] } | null; pinnedAnnouncements: string[]; facilitatorName: string }
export interface Session { id: string; title: string; speakers: string[]; startTime: string; endTime: string; room: string; track: string; description: string }
export interface Agenda { sessions: Session[]; venues: { id: string; name: string; tag: string }[]; prompts: string[] }
export interface Activity { id: string; text: string; page: Page; timestamp: string; read?: boolean }