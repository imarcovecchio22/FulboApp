import prisma from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export interface CreateEventDto {
  name: string;
  startDate: string; // ISO date string
  endDate: string;
}

export interface JoinEventDto {
  name: string;
}

export interface VoteSlot {
  date: string;   // YYYY-MM-DD
  timeSlot: string; // HH:mm
}

export interface AvailabilityDto {
  participantId: string;
  eventId: string;
  slots: VoteSlot[];
}

export interface SlotResult {
  date: string;
  timeSlot: string;
  count: number;
  participants: string[];
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function listEvents() {
  return prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      _count: { select: { participants: true } },
    },
  });
}

export async function createEvent(dto: CreateEventDto) {
  const event = await prisma.event.create({
    data: {
      id: uuidv4(),
      name: dto.name,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    },
  });
  return event;
}

export async function getEventById(id: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          availabilities: true,
        },
      },
      availabilities: {
        include: { participant: true },
      },
    },
  });
  return event;
}

// ─── Participants ─────────────────────────────────────────────────────────────

export async function joinEvent(eventId: string, dto: JoinEventDto) {
  // Upsert: returning existing participant if name already taken for this event
  const participant = await prisma.participant.upsert({
    where: {
      name_eventId: { name: dto.name, eventId },
    },
    create: {
      id: uuidv4(),
      name: dto.name,
      eventId,
    },
    update: {}, // no-op update, just return existing
  });
  return participant;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function saveAvailability(dto: AvailabilityDto) {
  const { participantId, eventId, slots } = dto;

  // Validate participant belongs to event
  const participant = await prisma.participant.findFirst({
    where: { id: participantId, eventId },
  });
  if (!participant) throw new Error('Participant not found in this event');

  // Delete old slots for this participant+event, then re-insert
  await prisma.availability.deleteMany({
    where: { participantId, eventId },
  });

  if (slots.length === 0) return [];

  const created = await prisma.availability.createMany({
    data: slots.map((slot) => ({
      id: uuidv4(),
      participantId,
      eventId,
      date: new Date(slot.date),
      timeSlot: slot.timeSlot,
    })),
    skipDuplicates: true,
  });

  return created;
}

// ─── Results ──────────────────────────────────────────────────────────────────

export async function getEventResults(eventId: string): Promise<SlotResult[]> {
  const availabilities = await prisma.availability.findMany({
    where: { eventId },
    include: { participant: true },
  });

  // Group by date + timeSlot
  const map = new Map<string, SlotResult>();

  for (const av of availabilities) {
    const dateStr = av.date.toISOString().split('T')[0];
    const key = `${dateStr}|${av.timeSlot}`;

    if (!map.has(key)) {
      map.set(key, { date: dateStr, timeSlot: av.timeSlot, count: 0, participants: [] });
    }

    const entry = map.get(key)!;
    entry.count++;
    entry.participants.push(av.participant.name);
  }

  // Sort by count desc, then date asc, then time asc
  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.timeSlot.localeCompare(b.timeSlot);
  });
}
