/**
 * AI Tools Definitions
 * These are the functions that Gemini can invoke during conversations.
 * Date parsing now relies on Luxon for richer natural language support.
 */
import { DateTime } from 'luxon';
import { prisma } from '../../lib/prisma';
import { AITool, AvailablePlace, CreateEventParams, EventCreationResult } from './types';

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

const stripTimeComponents = (value: string): string => {
  let sanitized = value;
  for (const regex of timeRegexes) {
    sanitized = sanitized.replace(regex, ' ');
  }
  return sanitized.replace(/\s+/g, ' ').trim();
};

const weekdayMap: Record<string, number> = {
  domingo: 7,
  sunday: 7,
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
    return base.set({ hour: timeInfo.hour, minute: timeInfo.minute, second: 0, millisecond: 0 });
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

  const weekdayMatch = lower.match(/(este|próximo|proximo|siguiente)?\s*(domingo|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado)/);
  if (weekdayMatch) {
    const modifier = weekdayMatch[1];
    const dayName = weekdayMatch[2];
    const targetWeekday = weekdayMap[dayName];
    if (targetWeekday) {
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
  const now = DateTime.now().setZone(EVENT_TIMEZONE);
  const sanitized = stripTimeComponents(trimmed);
  const sanitizedLower = sanitized.toLowerCase();
  const baseForFormats = sanitized || trimmed;

  // Try ISO first
  const iso = DateTime.fromISO(trimmed, { zone: EVENT_TIMEZONE });
  if (iso.isValid) {
    const hasExplicitTime = /t\d{1,2}[:\.]\d{2}/i.test(trimmed) || /\d{1,2}[:\.]\d{2}/.test(trimmed);
    const dateWithTime = hasExplicitTime ? iso : applyTime(iso, timeInfo);
    return { success: true, date: hasExplicitTime ? iso : dateWithTime };
  }

  // Numeric formats
  const numericFormats = [
    { format: 'd/M/yyyy', locale: 'es' },
    { format: 'd-M-yyyy', locale: 'es' },
    { format: 'd.M.yyyy', locale: 'es' },
    { format: 'M/d/yyyy', locale: 'en' },
    { format: 'yyyy/M/d', locale: 'en' },
    { format: 'yyyy-M-d', locale: 'en' },
  ];

  const numericResult = parseWithFormats(baseForFormats, numericFormats, timeInfo, now);
  if (numericResult) {
    return { success: true, date: numericResult };
  }

  // Numeric without year
  const shortDateMatch = baseForFormats.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
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

  // Month name (Spanish / English)
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

  const monthResult = parseWithFormats(baseForFormats, monthFormats, timeInfo, now);
  if (monthResult) {
    return { success: true, date: monthResult };
  }

  // Relative keywords
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return places;
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
    const { placeId, eventName, description, minAge = 18, date } = params;

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

      if (!eventDate.isValid) {
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

      const event = await prisma.event.create({
        data: {
          name: eventName,
          description: description || `Evento creado en ${place.name}`,
          timeBegin: eventDate.toJSDate(),
          placeId: place.id,
          organizerId: userId,
          minAge,
          status: 'proximo',
        },
        include: {
          place: {
            select: {
              name: true,
              city: true,
              direction: true,
            },
          },
        },
      });

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
        },
        message: `Evento "${eventName}" creado exitosamente en ${place.name}, ${place.city}`,
        details: {
          placeId: place.id,
          timeZone: EVENT_TIMEZONE,
          parsedDate: eventDate.toISO(),
        },
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
 * Export all available tools.
 */
export const availableTools: AITool[] = [getAvailablePlacesTool, createEventTool];
