import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

// Default = all events enabled on both channels.
// Frontend uses these same IDs (see app/src/.../settings/page.tsx NOTIF_EVENTS).
type NotifPref = { email: boolean; inApp: boolean };
type NotifPrefsMap = Record<string, NotifPref>;

const DEFAULT_PREF: NotifPref = { email: true, inApp: true };
export const NOTIF_EVENTS = [
  'issue_assigned',
  'issue_comment',
  'issue_status',
  'sprint_start',
  'due_date',
  'mention',
] as const;
export type NotifEvent = typeof NOTIF_EVENTS[number];

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitize(user: any) {
    const { password, ...rest } = user;
    return rest;
  }

  findAll(organizationId: string) {
    return this.prisma.user.findMany({
      where: { memberships: { some: { organizationId } } },
      select: { id: true, name: true, email: true, initials: true, image: true, role: true, createdAt: true },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return this.sanitize(user);
  }

  async remove(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }

  /** Return the user's notification prefs with defaults filled in for any missing event. */
  async getNotifPrefs(userId: string): Promise<NotifPrefsMap> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { notificationPrefs: true } });
    const stored = (user?.notificationPrefs as NotifPrefsMap | null) ?? {};
    const out: NotifPrefsMap = {};
    for (const ev of NOTIF_EVENTS) out[ev] = { ...DEFAULT_PREF, ...(stored[ev] ?? {}) };
    return out;
  }

  async updateNotifPrefs(userId: string, prefs: NotifPrefsMap): Promise<NotifPrefsMap> {
    const current = await this.getNotifPrefs(userId);
    const merged: NotifPrefsMap = { ...current };
    for (const [ev, pref] of Object.entries(prefs ?? {})) {
      if (!NOTIF_EVENTS.includes(ev as NotifEvent)) continue;
      merged[ev] = { ...current[ev], ...pref };
    }
    await this.prisma.user.update({ where: { id: userId }, data: { notificationPrefs: merged } });
    return merged;
  }

  /** True if the given user should receive a notification for `event` on `channel`. */
  async shouldNotify(userId: string, event: NotifEvent, channel: 'email' | 'inApp'): Promise<boolean> {
    const prefs = await this.getNotifPrefs(userId);
    return prefs[event]?.[channel] ?? true;
  }
}
