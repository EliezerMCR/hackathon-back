/**
 * AI Tools Definitions
 * These are the functions that Gemini can invoke during conversations.
 * Date parsing relies on Luxon for richer natural language support.
 */
import { EventVisibility } from '@prisma/client';
import { DateTime } from 'luxon';
import { prisma } from '../../lib/prisma';
import {
  AITool,
  AvailablePlace,
  CreateEventParams,
  EventCreationResult,
  CommunityEventSummary,
  CommunityEventsResult,
  JoinEventResult,
  PlaceReview,
  UpcomingEvent,
  EventUpdateResult,
} from './types';

const EVENT_TIMEZONE = process.env.EVENT_TIMEZONE || 'America/Caracas';
const DEFAULT_EVENT_TIME = { hour: 20, minute: 0 };

interface TimeInfo {
  hour: number;
  minute: number;
}

const timeRegexes = [
  /(?:^|\s)(\d{1,2})[:\.](\d{2})\s*(am|pm|a\.m\.|p\.m\.)?/i,
  /(?:^|\s)(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)/i,
  /(?:^|\s)(\d{1,2})\s*(?:h|hs|horas?)/i,
  /(?:a las|sobre las|para las)\s+(\d{1,2})(?:[:\.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i,
];

const weekdayMap: Record<string, number> = {
  domingo: 0,
  sunday: 0,
  lunes: 1,
  monday: 1,
  martes: 2,
  tuesday: 2,
  miercoles: 3,
  miércoles: 3,
  wednesday: 3,
  jueves: 4,
  thursday: 4,
  viernes: 5,
  friday: 5,
  sabado: 6,
  sábado: 6,
  saturday: 6,
};

const stripTimeComponents = (value: string): string => {
  let sanitized = value;
  for (const regex of timeRegexes) {
    sanitized = sanitized.replace(regex, ' ');
  }
  sanitized = sanitized.replace(/[,]/g, ' ');
  return sanitized.replace(/\s+/g, ' ').trim();
};

const cleanMeridiem = (value?: string | null) => value?.replace(/\./g, '').toLowerCase();

const toTwentyFourHour = (hour: number, meridiem?: string | null): number => {
  const cleaned = cleanMeridiem(meridiem);
  if (!cleaned) {
    return hour;
  }
  if (cleaned.includes('pm') && hour < 12) {
    return hour + 12;
  }
  if (cleaned.includes('am') && hour === 12) {
    return 0;
  }
  return hour;
};

const extractTimeInfo = (input: string): TimeInfo | null => {
  for (const regex of timeRegexes) {
    const match = input.match(regex);
    if (!match) {
      continue;
    }
    const hour = Number.parseInt(match[1], 10);
    if (Number.isNaN(hour) || hour > 24) {
      continue;
    }

    const minutePart = match[2];
    const meridiem = match[3];
    let minute = 0;

    if (minutePart) {
      minute = Number.parseInt(minutePart, 10);
      if (Number.isNaN(minute) || minute > 59) {
        minute = 0;
      }
    }

    const normalizedHour = toTwentyFourHour(hour, meridiem);
    return { hour: normalizedHour, minute };
  }

  return null;
};

const applyTime = (date: DateTime, timeInfo: TimeInfo | null): DateTime => {
  const base = date.setZone(EVENT_TIMEZONE);
  if (timeInfo) {
    return base.set({
      hour: timeInfo.hour,
      minute: timeInfo.minute,
      second: 0,
      millisecond: 0,
    });
  }
  return base.set({
    hour: DEFAULT_EVENT_TIME.hour,
    minute: DEFAULT_EVENT_TIME.minute,
    second: 0,
    millisecond: 0,
  });
};

const parseWithFormats = (
  value: string,
  formats: Array<{ format: string; locale: string; formatWithYear?: string }>,
  timeInfo: TimeInfo | null,
  referenceNow: DateTime = DateTime.now().setZone(EVENT_TIMEZONE)
): DateTime | null => {
  const hasYear = /\d{4}/.test(value);

  for (const { format, locale, formatWithYear } of formats) {
    let candidate = DateTime.fromFormat(value, format, {
      zone: EVENT_TIMEZONE,
      locale,
    });

    if (!candidate.isValid && !hasYear && formatWithYear) {
      candidate = DateTime.fromFormat(`${value} ${referenceNow.year}`, formatWithYear, {
        zone: EVENT_TIMEZONE,
        locale,
      });

      if (candidate.isValid && candidate < referenceNow) {
        candidate = candidate.plus({ year: 1 });
      }
    }

    if (candidate.isValid) {
      return applyTime(candidate, timeInfo);
    }
  }

  return null;
};

const parseRelativeDate = (lower: string, timeInfo: TimeInfo | null): DateTime | null => {
  const now = DateTime.now().setZone(EVENT_TIMEZONE).startOf('minute');

  if (lower.includes('pasado mañana')) {
    return applyTime(now.plus({ days: 2 }), timeInfo);
  }
  if (lower.includes('mañana') || lower.includes('tomorrow')) {
    return applyTime(now.plus({ days: 1 }), timeInfo);
  }
  if (lower.includes('hoy') || lower.includes('today')) {
    return applyTime(now, timeInfo);
  }
  if (lower.includes('fin de semana') || lower.includes('weekend')) {
    const daysUntilSaturday = (6 - now.weekday + 7) % 7 || 7;
    return applyTime(now.plus({ days: daysUntilSaturday }), timeInfo);
  }

  const weekdayMatch = lower.match(/(este|próximo|proximo|siguiente)?\s*(domingo|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
  if (weekdayMatch) {
    const modifier = weekdayMatch[1];
    const dayName = weekdayMatch[2];
    const targetWeekday = weekdayMap[dayName];
    if (targetWeekday !== undefined) {
      let daysToAdd = targetWeekday - now.weekday;
      if (daysToAdd < 0) {
        daysToAdd += 7;
      }
      if (daysToAdd === 0 && modifier && ['próximo', 'proximo', 'siguiente'].includes(modifier)) {
        daysToAdd = 7;
      } else if (daysToAdd === 0 && !modifier && applyTime(now, timeInfo) <= now) {
        daysToAdd = 7;
      }
      return applyTime(now.plus({ days: daysToAdd }), timeInfo);
    }
  }

  return null;
};

const parseNaturalLanguageDate = (
  input: string
): { success: boolean; date?: DateTime; message?: string; reason?: string } => {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      success: false,
      reason: 'EMPTY_DATE',
      message: 'No recibí una fecha. Por favor indica cuándo quieres el evento.',
    };
  }

  const lower = trimmed.toLowerCase();
  const timeInfo = extractTimeInfo(lower);
  const sanitized = stripTimeComponents(trimmed);
  const sanitizedLower = sanitized.toLowerCase();
  const now = DateTime.now().setZone(EVENT_TIMEZONE);

  const iso = DateTime.fromISO(trimmed, { zone: EVENT_TIMEZONE });
  if (iso.isValid) {
    const hasExplicitTime = /t\d{1,2}[:\.]\d{2}/i.test(trimmed) || /\d{1,2}[:\.]\d{2}/.test(trimmed);
    const dateWithTime = hasExplicitTime ? iso : applyTime(iso, timeInfo);
    return { success: true, date: hasExplicitTime ? iso : dateWithTime };
  }

  const numericFormats = [
    { format: 'd/M/yyyy', locale: 'es' },
    { format: 'd-M-yyyy', locale: 'es' },
    { format: 'd.M.yyyy', locale: 'es' },
    { format: 'M/d/yyyy', locale: 'en' },
    { format: 'yyyy/M/d', locale: 'en' },
    { format: 'yyyy-M-d', locale: 'en' },
  ];

  const numericResult = parseWithFormats(sanitized, numericFormats, timeInfo, now);
  if (numericResult) {
    return { success: true, date: numericResult };
  }

  const shortDateMatch = sanitized.match(/^(\d{1,2})[\/-](\d{1,2})$/);
  if (shortDateMatch) {
    const day = shortDateMatch[1];
    const month = shortDateMatch[2];
    const candidate = DateTime.fromFormat(`${day}/${month}/${now.year}`, 'd/M/yyyy', {
      zone: EVENT_TIMEZONE,
      locale: 'es',
    });
    if (candidate.isValid) {
      const adjusted = candidate < now ? candidate.plus({ year: 1 }) : candidate;
      return { success: true, date: applyTime(adjusted, timeInfo) };
    }
  }

  const monthFormats = [
    {
      format: "d 'de' MMMM yyyy",
      locale: 'es',
      formatWithYear: "d 'de' MMMM yyyy",
    },
    {
      format: 'd MMMM yyyy',
      locale: 'es',
      formatWithYear: 'd MMMM yyyy',
    },
    {
      format: 'd MMM yyyy',
      locale: 'es',
      formatWithYear: 'd MMM yyyy',
    },
    {
      format: 'MMMM d yyyy',
      locale: 'en',
      formatWithYear: 'MMMM d yyyy',
    },
    {
      format: 'MMM d yyyy',
      locale: 'en',
      formatWithYear: 'MMM d yyyy',
    },
  ];

  const monthResult = parseWithFormats(sanitized, monthFormats, timeInfo, now);
  if (monthResult) {
    return { success: true, date: monthResult };
  }

  const relativeResult = parseRelativeDate(sanitizedLower, timeInfo);
  if (relativeResult) {
    return { success: true, date: relativeResult };
  }

  return {
    success: false,
    reason: 'UNPARSEABLE_DATE',
    message: `No pude entender la fecha "${input}". Intenta con un formato como "2025-10-20", "viernes a las 7pm" o "31 de mayo 19h".`,
  };
};

const MAX_PLACE_SUMMARY_LENGTH = 200;

const generatePlaceSummary = (place: {
  name: string;
  description?: string | null;
  city?: string | null;
  type?: string | null;
}) => {
  if (place.description) {
    const cleaned = place.description.replace(/\s+/g, ' ').trim();
    if (cleaned) {
      if (cleaned.length <= MAX_PLACE_SUMMARY_LENGTH) {
        return cleaned;
      }
      return `${cleaned.slice(0, MAX_PLACE_SUMMARY_LENGTH - 1).trimEnd()}…`;
    }
  }

  const parts: string[] = [place.name];
  if (place.type) {
    parts.push(place.type);
  }
  if (place.city) {
    parts.push(`en ${place.city}`);
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

/**
 * Tool: Get available places for events.
 */
export const getAvailablePlacesTool: AITool = {
  name: 'get_available_places',
  description:
    'Get a list of available places/venues where events can be created. IMPORTANT: City is REQUIRED - you must always ask the user for their city before calling this function. Returns multiple options for the user to choose from.',
  parameters: {
    type: 'object',
    properties: {
      city: {
        type: 'string',
        description:
          "REQUIRED: The city where to search for places. You MUST ask the user for their city if they haven't provided it yet.",
      },
      type: {
        type: 'string',
        description: 'Filter by place type (e.g., restaurant, bar, club, park)',
      },
      minCapacity: {
        type: 'number',
        description: 'Minimum capacity required',
      },
      limit: {
        type: 'number',
        description:
          'Number of results to return. Default is 10 to give user good options to choose from.',
      },
    },
    required: ['city'],
  },
  handler: async (params: {
    city?: string;
    type?: string;
    minCapacity?: number;
    limit?: number;
  }): Promise<AvailablePlace[]> => {
    const { city, type, minCapacity, limit = 10 } = params;

    const where: any = {
      status: 'ACCEPTED',
    };

    if (city) {
      where.city = {
        contains: city,
        mode: 'insensitive',
      };
    }

    if (type) {
      where.type = {
        contains: type,
        mode: 'insensitive',
      };
    }

    if (minCapacity) {
      where.capacity = {
        gte: minCapacity,
      };
    }

    const places = await prisma.place.findMany({
      where,
      take: limit,
      select: {
        id: true,
        name: true,
        city: true,
        capacity: true,
        type: true,
        direction: true,
        description: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return places.map(place => {
      const summary = generatePlaceSummary(place);

      return {
        id: place.id,
        name: place.name,
        city: place.city,
        capacity: place.capacity,
        type: place.type,
        summary: summary || place.name,
        internalNotes: {
          includeCapacity: Boolean(place.capacity && place.capacity >= 150),
          direction: place.direction,
        },
      };
    });
  },
};

const sanitizeComment = (text: string | null, maxLength = 220): string | null => {
  if (!text) {
    return null;
  }
  const cleaned = text.replace(/\s+/g, ' ').replace(/[!¡]{2,}/g, '!').replace(/[?¿]{2,}/g, '?').trim();
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
};

const decimalToNumber = (value: any): number => {
  if (value && typeof value === 'object' && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const toneFromRating = (rating: number): 'positive' | 'neutral' | 'negative' => {
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
};

/**
 * Tool: Get reviews for a place.
 */
export const getPlaceReviewsTool: AITool = {
  name: 'get_place_reviews',
  description:
    'Obtiene una muestra de reseñas (comentarios y calificaciones) para un lugar específico usando su ID real. Úsala cuando el usuario pida opiniones o experiencias de un sitio recomendado.',
  parameters: {
    type: 'object',
    properties: {
      placeId: {
        type: 'number',
        description:
          'REQUIRED: ID del lugar entregado previamente por get_available_places. Usa el ID correspondiente al lugar del que el usuario quiere saber.',
      },
      limit: {
        type: 'number',
        description: 'Cantidad máxima de reseñas a devolver (por defecto 3).',
      },
    },
    required: ['placeId'],
  },
  handler: async (
    params: { placeId: number; limit?: number },
    _userId: number
  ): Promise<{
    success: boolean;
    place?: { id: number; name: string; city: string | null };
    summary?: { totalReviews: number; averageRating: number | null };
    reviews?: PlaceReview[];
    message?: string;
    reason?: string;
  }> => {
    const { placeId, limit = 3 } = params;

    if (!placeId || Number.isNaN(placeId)) {
      return {
        success: false,
        reason: 'INVALID_PLACE_ID',
        message: 'Debes proporcionar un placeId válido para consultar reseñas.',
      };
    }

    const place = await prisma.place.findUnique({
      where: { id: placeId },
      select: {
        id: true,
        name: true,
        city: true,
      },
    });

    if (!place) {
      return {
        success: false,
        reason: 'PLACE_NOT_FOUND',
        message: `No encontré información para el lugar con ID ${placeId}.`,
      };
    }

    const [reviews, totalInfo] = await Promise.all([
      prisma.review.findMany({
        where: { placeId },
        orderBy: { createdAt: 'desc' },
        take: Math.max(1, Math.min(limit, 5)),
        select: {
          calification: true,
          comment: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.review.aggregate({
        where: { placeId },
        _avg: { calification: true },
        _count: { _all: true },
      }),
    ]);

    if (totalInfo._count._all === 0) {
      return {
        success: true,
        place,
        summary: {
          totalReviews: 0,
          averageRating: null,
        },
        reviews: [],
        message: 'Este lugar aún no tiene comentarios publicados.',
      };
    }

    const formatted: PlaceReview[] = reviews.map(review => ({
      reviewer: {
        id: review.user.id,
        name: review.user.name,
        lastName: review.user.lastName,
      },
      rating: review.calification,
      comment: sanitizeComment(review.comment),
      createdAt: review.createdAt.toISOString(),
      tone: toneFromRating(review.calification),
    }));

    return {
      success: true,
      place,
      summary: {
        totalReviews: totalInfo._count._all,
        averageRating: totalInfo._avg.calification ?? null,
      },
      reviews: formatted,
    };
  },
};

/**
 * Tool: Create an event at a specific place.
 */
export const createEventTool: AITool = {
  name: 'create_event',
  description:
    'Creates a new event at a specified place/venue using the place ID. IMPORTANT: Use the exact place ID from the get_available_places results. When user selects "the first one" or "La Trattoria", match it to the ID from your previous search results.',
  parameters: {
    type: 'object',
    properties: {
      placeId: {
        type: 'number',
        description:
          'REQUIRED: The ID of the place from get_available_places results. When user says "the first one" use the ID of the first place in your list. When they say a name, find the matching place ID from your previous search.',
      },
      eventName: {
        type: 'string',
        description:
          'Name of the event. If user didn\'t specify, create a descriptive name like "Reunión en [Place]" o "Evento en [Place]".',
      },
      description: {
        type: 'string',
        description: 'Optional description. Can be omitted - system will auto-generate if needed.',
      },
      date: {
        type: 'string',
        description:
          'Date in natural language like "2025-10-20", "mañana", "viernes 8pm". If user said "hoy" o solo mencionó una fecha futura sin detalles, infiere una fecha razonable. La hora por defecto es 8pm si no se menciona.',
      },
      minAge: {
        type: 'number',
        description:
          'Minimum age (default: 18). Only specify if user explicitly mentions age restrictions.',
      },
    },
    required: ['placeId', 'eventName', 'date'],
  },
  handler: async (params: CreateEventParams, userId: number): Promise<EventCreationResult> => {
    const {
      placeId,
      eventName,
      description,
      minAge = 18,
      date,
      communityId,
      visibility,
    } = params;

    try {
      const place = await prisma.place.findUnique({
        where: { id: placeId },
      });

      if (!place) {
        return {
          success: false,
          reason: 'PLACE_NOT_FOUND',
          message: `No se encontró el lugar con ID ${placeId}. Por favor busca lugares disponibles primero.`,
          details: { placeId },
        };
      }

      if (place.status !== 'ACCEPTED') {
        return {
          success: false,
          reason: 'PLACE_NOT_AVAILABLE',
          message: `El lugar "${place.name}" no está disponible actualmente.`,
          details: { placeId, status: place.status },
        };
      }

      const parsedDateResult = parseNaturalLanguageDate(date);
      if (!parsedDateResult.success || !parsedDateResult.date) {
        return {
          success: false,
          reason: parsedDateResult.reason || 'INVALID_DATE',
          message:
            parsedDateResult.message ||
            `La fecha "${date}" no es válida. Por favor proporciona una fecha válida.`,
          details: { input: date },
        };
      }

      const eventDate = parsedDateResult.date;

      if (!eventDate || !eventDate.isValid) {
        return {
          success: false,
          reason: 'INVALID_DATE',
          message: `No pude interpretar la fecha "${date}".`,
          details: { input: date },
        };
      }

      const now = DateTime.now().setZone(EVENT_TIMEZONE);
      if (eventDate <= now) {
        return {
          success: false,
          reason: 'PAST_DATE',
          message: `La fecha "${date}" parece estar en el pasado. Por favor proporciona una fecha futura.`,
          details: {
            input: date,
            parsedDate: eventDate.toISO(),
            now: now.toISO(),
          },
        };
      }

      let targetCommunityId: number | null = null;

      if (typeof communityId === 'number' && !Number.isNaN(communityId)) {
        const community = await prisma.community.findUnique({
          where: { id: communityId },
          select: {
            id: true,
            name: true,
          },
        });

        if (!community) {
          return {
            success: false,
            reason: 'COMMUNITY_NOT_FOUND',
            message: `No se encontró la comunidad con ID ${communityId}.`,
          };
        }

        const membership = await prisma.community_Member.findUnique({
          where: {
            userId_communityId: {
              userId,
              communityId,
            },
          },
          select: {
            exitAt: true,
          },
        });

        if (!membership || membership.exitAt) {
          return {
            success: false,
            reason: 'NOT_COMMUNITY_MEMBER',
            message: `No perteneces a la comunidad con ID ${communityId}. No puedo crear un evento allí.`,
          };
        }

        targetCommunityId = community.id;
      }

      const selectedVisibility =
        visibility && visibility === 'PUBLIC' ? EventVisibility.PUBLIC : EventVisibility.PRIVATE;

      if (selectedVisibility === EventVisibility.PUBLIC && !targetCommunityId) {
        return {
          success: false,
          reason: 'PUBLIC_EVENT_REQUIRES_COMMUNITY',
          message: 'Para crear un evento público debes indicar una comunidad anfitriona.',
        };
      }

      const eventDateUtc = eventDate.setZone('UTC');
      const defaultDurationHours = 3;
      const timeEndUtc = eventDateUtc.plus({ hours: defaultDurationHours });

      const event = await prisma.event.create({
        data: {
          name: eventName,
          description: description?.trim() || `Evento creado en ${place.name}`,
          timeBegin: eventDateUtc.toJSDate(),
          timeEnd: timeEndUtc.toJSDate(),
          placeId: place.id,
          organizerId: userId,
          minAge,
          status: 'proximo',
          communityId: targetCommunityId,
          visibility: selectedVisibility,
        },
        include: {
          place: {
            select: {
              name: true,
              city: true,
            },
          },
          community: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      const localTime = eventDate.setZone(EVENT_TIMEZONE);
      const localEnd = timeEndUtc.setZone(EVENT_TIMEZONE);

      const localTimeDescription = localTime.toFormat('cccc d LLL yyyy, hh:mm a');
      const localEndDescription = localEnd.toFormat('cccc d LLL yyyy, hh:mm a');

      return {
        success: true,
        event: {
          id: event.id,
          name: event.name,
          place: {
            name: event.place.name,
            city: event.place.city,
          },
          timeBegin: event.timeBegin,
          timeEnd: event.timeEnd,
        },
        message: `Evento "${eventName}" creado exitosamente en ${place.name}${
          event.place.city ? `, ${event.place.city}` : ''
        }${event.community ? ` para la comunidad ${event.community.name}` : ''}.`,
        details: {
          placeId: place.id,
          communityId: targetCommunityId,
          visibility: selectedVisibility,
          parsedDate: eventDate.toISO(),
          localTimeDescription,
          localEndDescription,
        },
        localTimeDescription,
        localEndDescription,
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      return {
        success: false,
        reason: 'UNKNOWN_ERROR',
        message: 'Hubo un error al crear el evento. Por favor intenta nuevamente.',
        details: {
          error: error?.message,
        },
      };
    }
  },
};

/**
 * Tool: List upcoming events for the authenticated user.
 */
export const getUpcomingEventsTool: AITool = {
  name: 'get_upcoming_events',
  description:
    'Obtiene los próximos eventos creados por el usuario autenticado. Úsalo cuando quiera repasar lo que ya tiene programado.',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Máximo de eventos a mostrar (por defecto 5, máximo 20).',
      },
      daysAhead: {
        type: 'number',
        description: 'Cuántos días hacia el futuro se consideran (por defecto 30).',
      },
    },
  },
  handler: async (
    params: { limit?: number; daysAhead?: number },
    userId: number
  ): Promise<{
    success: boolean;
    events: UpcomingEvent[];
    message?: string;
  }> => {
    const limit = params?.limit ?? 5;
    const daysAhead = params?.daysAhead ?? 30;
    const now = DateTime.now().setZone(EVENT_TIMEZONE);
    const maxDate = now.plus({ days: daysAhead });

    const events = await prisma.event.findMany({
      where: {
        organizerId: userId,
        timeBegin: {
          gte: now.toJSDate(),
          lte: maxDate.toJSDate(),
        },
      },
      orderBy: {
        timeBegin: 'asc',
      },
      take: Math.min(Math.max(limit, 1), 20),
      select: {
        id: true,
        name: true,
        timeBegin: true,
        timeEnd: true,
        status: true,
        description: true,
        place: {
          select: {
            id: true,
            name: true,
            city: true,
            description: true,
            type: true,
          },
        },
        tickets: {
          select: {
            price: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            calification: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (events.length === 0) {
      return {
        success: true,
        events: [],
        message: 'No tienes eventos programados en los próximos 30 días.',
      };
    }

    const formattedEvents = events.map(event => {
      const localTime = DateTime.fromJSDate(event.timeBegin).setZone(EVENT_TIMEZONE);
      const localEnd = event.timeEnd
        ? DateTime.fromJSDate(event.timeEnd).setZone(EVENT_TIMEZONE)
        : null;

      const timeBeginIso =
        (localTime.isValid && localTime.toISO()) ||
        DateTime.fromJSDate(event.timeBegin).toISO() ||
        event.timeBegin.toISOString();

      const localDescription = localTime.isValid
        ? localTime.toFormat('cccc d LLL yyyy, hh:mm a')
        : DateTime.fromJSDate(event.timeBegin).toFormat('cccc d LLL yyyy, hh:mm a');

      const timeEndIso =
        (localEnd && localEnd.isValid && localEnd.toISO()) ||
        (event.timeEnd ? DateTime.fromJSDate(event.timeEnd).toISO() : null);

      const localEndDescription =
        localEnd && localEnd.isValid
          ? localEnd.toFormat('hh:mm a')
          : event.timeEnd
            ? DateTime.fromJSDate(event.timeEnd)
                .setZone(EVENT_TIMEZONE)
                .toFormat('hh:mm a')
            : null;

      const priceNumbers =
        event.tickets?.map(ticket => decimalToNumber(ticket.price)).filter(price => Number.isFinite(price) && price > 0) ?? [];
      const lowestPriceNumber = priceNumbers.length > 0 ? Math.min(...priceNumbers) : undefined;
      const ticketInfo =
        (event.tickets?.length ?? 0) > 0
          ? {
              requiresPurchase: true,
              lowestPrice:
                lowestPriceNumber !== undefined && Number.isFinite(lowestPriceNumber)
                  ? lowestPriceNumber.toFixed(2)
                  : undefined,
            }
          : { requiresPurchase: false };

      const recentReviews =
        event.reviews?.map(review => ({
          reviewerName: [review.user?.name, review.user?.lastName].filter(Boolean).join(' ') || null,
          rating: review.calification,
          comment: sanitizeComment(review.comment),
          createdAt: review.createdAt.toISOString(),
        })) ?? [];

      return {
        id: event.id,
        name: event.name,
        timeBegin: timeBeginIso,
        timeEnd: timeEndIso,
        status: event.status,
        localTimeDescription: localDescription,
        localEndDescription: localEndDescription,
        place: {
          id: event.place.id,
          name: event.place.name,
          city: event.place.city,
          summary: generatePlaceSummary({
            name: event.place.name,
            description: event.place.description,
            city: event.place.city,
            type: event.place.type,
          }),
        },
        ticketInfo,
        recentReviews,
      };
    });

    const summaryLines = formattedEvents.map(ev => {
      const location = ev.place.city ? ` en ${ev.place.city}` : '';
      const endSegment = ev.localEndDescription
        ? ` y termina a las ${ev.localEndDescription}`
        : ' y no tiene una hora de cierre registrada';
      return `• ${ev.name}${location} – ${ev.localTimeDescription}${endSegment}`;
    });

    return {
      success: true,
      events: formattedEvents,
      message: ['Estos son tus eventos para los próximos 30 días:']
        .concat(summaryLines)
        .join('\n'),
    };
  },
};

/**
 * Tool: List events for a community the user belongs to.
 */
export const getCommunityEventsTool: AITool = {
  name: 'get_community_events',
  description:
    'Devuelve los eventos asociados a una comunidad en la que el usuario participa. Ideal para mostrar los planes disponibles dentro de la comunidad.',
  parameters: {
    type: 'object',
    properties: {
      communityId: {
        type: 'number',
        description: 'REQUIRED: ID de la comunidad a consultar.',
      },
      status: {
        type: 'string',
        description: 'Filtro opcional por estado del evento (por ejemplo "proximo", "finalizado").',
      },
      visibility: {
        type: 'string',
        enum: ['PUBLIC', 'PRIVATE'],
        description: 'Filtra por visibilidad del evento. Por defecto se muestran ambos.',
      },
      upcomingOnly: {
        type: 'boolean',
        description: 'Si es true, solo devuelve eventos con fecha futura.',
      },
      limit: {
        type: 'number',
        description: 'Límite opcional de resultados (por defecto 10, máximo 20).',
      },
    },
    required: ['communityId'],
  },
  handler: async (
    params: { communityId: number; status?: string; visibility?: 'PUBLIC' | 'PRIVATE'; upcomingOnly?: boolean; limit?: number },
    userId: number
  ): Promise<CommunityEventsResult> => {
    const { communityId, status, visibility, upcomingOnly = false } = params;
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 20);

    if (!communityId || Number.isNaN(communityId)) {
      return {
        success: false,
        reason: 'INVALID_COMMUNITY_ID',
        events: [],
        message: 'Debes proporcionar el ID de la comunidad para consultar sus eventos.',
      };
    }

    const membership = await prisma.community_Member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId,
        },
      },
      select: {
        exitAt: true,
      },
    });

    if (!membership || membership.exitAt) {
      return {
        success: false,
        reason: 'NOT_COMMUNITY_MEMBER',
        events: [],
        message: 'No perteneces a esa comunidad, por lo que no puedo mostrarte sus eventos.',
      };
    }

    const where: any = {
      communityId,
    };

    if (status) {
      where.status = status;
    }

    if (visibility) {
      where.visibility = visibility;
    }

    if (upcomingOnly) {
      where.timeBegin = {
        gte: new Date(),
      };
    }

    const events = await prisma.event.findMany({
      where,
      take: limit,
      orderBy: {
        timeBegin: 'asc',
      },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
            image: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            lastName: true,
            image: true,
          },
        },
        tickets: {
          select: {
            price: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            calification: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                name: true,
                lastName: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendees: true,
            reviews: true,
          },
        },
      },
    });

    const formatted: CommunityEventSummary[] = events.map(event => {
      const localBegin = DateTime.fromJSDate(event.timeBegin).setZone(EVENT_TIMEZONE);
      const localEnd = event.timeEnd
        ? DateTime.fromJSDate(event.timeEnd).setZone(EVENT_TIMEZONE)
        : null;

      const priceNumbers =
        event.tickets?.map(ticket => decimalToNumber(ticket.price)).filter(price => Number.isFinite(price) && price > 0) ?? [];
      const lowestPriceNumber = priceNumbers.length > 0 ? Math.min(...priceNumbers) : undefined;
      const ticketInfo =
        (event.tickets?.length ?? 0) > 0
          ? {
              requiresPurchase: true,
              lowestPrice:
                lowestPriceNumber !== undefined && Number.isFinite(lowestPriceNumber)
                  ? lowestPriceNumber.toFixed(2)
                  : undefined,
            }
          : { requiresPurchase: false };

      const recentReviews =
        event.reviews?.map(review => ({
          reviewerName: [review.user?.name, review.user?.lastName].filter(Boolean).join(' ') || null,
          rating: review.calification,
          comment: sanitizeComment(review.comment),
          createdAt: review.createdAt.toISOString(),
        })) ?? [];

      return {
        id: event.id,
        name: event.name,
        description: event.description,
        timeBegin: event.timeBegin.toISOString(),
        timeEnd: event.timeEnd ? event.timeEnd.toISOString() : null,
        localTimeDescription: localBegin.toFormat('cccc d LLL yyyy, hh:mm a'),
        localEndDescription: localEnd ? localEnd.toFormat('cccc d LLL yyyy, hh:mm a') : null,
        status: event.status,
        visibility: event.visibility,
        place: event.place
          ? {
              id: event.place.id,
              name: event.place.name,
              city: event.place.city,
              country: event.place.country,
              image: event.place.image,
            }
          : null,
        organizer: event.organizer
          ? {
              id: event.organizer.id,
              name: event.organizer.name,
              lastName: event.organizer.lastName,
              image: event.organizer.image,
            }
          : null,
        attendeeCount: event._count.attendees,
        ticketInfo,
        recentReviews,
      };
    });

    if (formatted.length === 0) {
      return {
        success: true,
        events: [],
        message: 'La comunidad no tiene eventos que coincidan con ese filtro.',
      };
    }

    const summaryLines = formatted.map(event => {
      const placeInfo = event.place?.city ? ` en ${event.place.city}` : '';
      return `• ${event.name}${placeInfo} – ${event.localTimeDescription}`;
    });

    return {
      success: true,
      events: formatted,
      message: ['Eventos disponibles en la comunidad:'].concat(summaryLines).join('\n'),
    };
  },
};

/**
 * Tool: Join a public community event.
 */
export const joinCommunityEventTool: AITool = {
  name: 'join_community_event',
  description:
    'Permite inscribirse en un evento público de una comunidad a la que pertenece el usuario.',
  parameters: {
    type: 'object',
    properties: {
      eventId: {
        type: 'number',
        description: 'REQUIRED: ID del evento al que se desea unir.',
      },
    },
    required: ['eventId'],
  },
  handler: async (params: { eventId: number }, userId: number): Promise<JoinEventResult> => {
    const { eventId } = params;

    if (!eventId || Number.isNaN(eventId)) {
      return {
        success: false,
        reason: 'INVALID_EVENT_ID',
        message: 'Debes proporcionar un ID de evento válido para unirte.',
      };
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        timeBegin: true,
        visibility: true,
        communityId: true,
        status: true,
        community: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      return {
        success: false,
        reason: 'EVENT_NOT_FOUND',
        message: 'No encontré un evento con ese ID.',
      };
    }

    if (event.visibility !== EventVisibility.PUBLIC) {
      return {
        success: false,
        reason: 'EVENT_NOT_PUBLIC',
        message: 'Ese evento es privado, no se puede unir automáticamente.',
      };
    }

    if (!event.communityId) {
      return {
        success: false,
        reason: 'EVENT_HAS_NO_COMMUNITY',
        message: 'El evento no tiene una comunidad asociada, por lo que se considera privado.',
      };
    }

    if (['finalizado', 'cancelado'].includes(event.status)) {
      return {
        success: false,
        reason: 'EVENT_NOT_ACTIVE',
        message: 'Ese evento ya no está activo, no puedo registrarte.',
      };
    }

    const membership = await prisma.community_Member.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: event.communityId,
        },
      },
      select: {
        exitAt: true,
      },
    });

    if (!membership || membership.exitAt) {
      return {
        success: false,
        reason: 'NOT_COMMUNITY_MEMBER',
        message: 'Solo los miembros activos de la comunidad pueden unirse a este evento público.',
      };
    }

    const existingAttendance = await prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId,
        },
      },
    });

    const localTime = DateTime.fromJSDate(event.timeBegin).setZone(EVENT_TIMEZONE);
    const localTimeDescription = localTime.toFormat('cccc d LLL yyyy, hh:mm a');

    if (existingAttendance) {
      return {
        success: true,
        alreadyJoined: true,
        message: `Ya estabas registrado en "${event.name}". Nos vemos el ${localTimeDescription}.`,
        attendance: {
          eventId: existingAttendance.eventId,
          userId: existingAttendance.userId,
          joinedAt: existingAttendance.joinedAt.toISOString(),
          eventName: event.name,
          localTimeDescription,
        },
      };
    }

    const attendance = await prisma.eventAttendee.create({
      data: {
        eventId: event.id,
        userId,
      },
    });

    return {
      success: true,
      message: `¡Listo! Te uniste a "${event.name}". El evento es el ${localTimeDescription}.`,
      attendance: {
        eventId: attendance.eventId,
        userId: attendance.userId,
        joinedAt: attendance.joinedAt.toISOString(),
        eventName: event.name,
        localTimeDescription,
      },
    };
  },
};

/**
 * Tool: Update an existing event organized by the user.
 */
export const updateEventTool: AITool = {
  name: 'update_event',
  description:
    'Permite modificar un evento del usuario (nombre, fecha, descripción). Úsalo cuando quiera ajustar detalles de algo ya creado.',
  parameters: {
    type: 'object',
    properties: {
      eventId: {
        type: 'number',
        description: 'REQUIRED: ID del evento que deseas modificar.',
      },
      eventName: {
        type: 'string',
        description: 'Nuevo nombre del evento (opcional).',
      },
      description: {
        type: 'string',
        description: 'Nueva descripción o notas para el evento (opcional).',
      },
      date: {
        type: 'string',
        description:
          'Nueva fecha en lenguaje natural (por ejemplo "este viernes 9pm"). Si se omite, no se toca la fecha.',
      },
    },
    required: ['eventId'],
  },
  handler: async (
    params: { eventId: number; eventName?: string; description?: string; date?: string },
    userId: number
  ): Promise<EventUpdateResult> => {
    const { eventId, eventName, description, date } = params;

    if (!eventId || Number.isNaN(eventId)) {
      return {
        success: false,
        reason: 'INVALID_EVENT_ID',
        message: 'Debes indicar un ID de evento válido para modificarlo.',
      };
    }

    if (!eventName && !description && !date) {
      return {
        success: false,
        reason: 'NO_UPDATES_PROVIDED',
        message: 'Indica qué quieres modificar (nombre, descripción o fecha).',
      };
    }

    const existing = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        place: {
          select: {
            id: true,
            name: true,
            city: true,
          },
        },
      },
    });

    if (!existing || existing.organizerId !== userId) {
      return {
        success: false,
        reason: 'EVENT_NOT_FOUND',
        message: 'No encontré un evento tuyo con ese ID.',
      };
    }

    const data: any = {};
    let parsedDate: DateTime | undefined;

    if (eventName) {
      data.name = eventName;
    }

    if (typeof description === 'string') {
      data.description = description.trim();
    }

    if (date) {
      const parsed = parseNaturalLanguageDate(date);
      if (!parsed.success || !parsed.date) {
        return {
          success: false,
          reason: parsed.reason || 'INVALID_DATE',
          message:
            parsed.message ||
            `No pude interpretar la nueva fecha "${date}". Por favor indícala con más detalle.`,
        };
      }
      parsedDate = parsed.date;

      if (!parsedDate.isValid) {
        return {
          success: false,
          reason: 'INVALID_DATE',
          message: `No pude interpretar la nueva fecha "${date}".`,
        };
      }

      const now = DateTime.now().setZone(EVENT_TIMEZONE);
      if (parsedDate <= now) {
        return {
          success: false,
          reason: 'PAST_DATE',
          message: `La nueva fecha "${date}" parece estar en el pasado. Elige una fecha futura.`,
        };
      }

      const parsedDateUtc = parsedDate.setZone('UTC');
      data.timeBegin = parsedDateUtc.toJSDate();

      if (existing.timeEnd) {
        const durationMs = existing.timeEnd.getTime() - existing.timeBegin.getTime();
        if (durationMs > 0) {
          const newEnd = parsedDateUtc.plus({ milliseconds: durationMs });
          data.timeEnd = newEnd.toJSDate();
        }
      }
    }

    try {
      const updated = await prisma.event.update({
        where: { id: eventId },
        data,
        include: {
          place: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
        },
      });

      const localTime = DateTime.fromJSDate(updated.timeBegin).setZone(EVENT_TIMEZONE);
      const localEnd = updated.timeEnd
        ? DateTime.fromJSDate(updated.timeEnd).setZone(EVENT_TIMEZONE)
        : null;

      const timeBeginIso =
        (localTime.isValid && localTime.toISO()) ||
        DateTime.fromJSDate(updated.timeBegin).toISO() ||
        updated.timeBegin.toISOString();

      const timeEndIso =
        (localEnd && localEnd.isValid && localEnd.toISO()) ||
        (updated.timeEnd ? DateTime.fromJSDate(updated.timeEnd).toISO() : null);

      return {
        success: true,
        message: 'Evento actualizado correctamente.',
        event: {
          id: updated.id,
          name: updated.name,
          timeBegin: timeBeginIso,
          timeEnd: timeEndIso,
          localTimeDescription: localTime.toFormat('cccc d LLL yyyy, hh:mm a'),
          localEndDescription: localEnd ? localEnd.toFormat('cccc d LLL yyyy, hh:mm a') : null,
          description: updated.description,
          place: {
            id: updated.place.id,
            name: updated.place.name,
            city: updated.place.city,
          },
        },
      };
    } catch (error: any) {
      console.error('Error updating event:', error);
      return {
        success: false,
        reason: 'UNKNOWN_ERROR',
        message: 'Hubo un problema al actualizar el evento. Intenta nuevamente.',
        details: {
          error: error?.message,
        },
      };
    }
  },
};

/**
 * Export all available tools.
 */
export const availableTools: AITool[] = [
  getAvailablePlacesTool,
  getPlaceReviewsTool,
  getUpcomingEventsTool,
  getCommunityEventsTool,
  joinCommunityEventTool,
  updateEventTool,
  createEventTool,
];
