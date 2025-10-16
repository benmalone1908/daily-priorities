/**
 * Types for Announcements feature
 */

export interface Announcement {
  id: string;
  message: string;
  created_by: string;
  created_at: string;
  expires_at: string;
}

export interface AnnouncementInsert {
  message: string;
  created_by: string;
  expires_at: string;
}

export interface AnnouncementUpdate {
  message?: string;
  expires_at?: string;
}
