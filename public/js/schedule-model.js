/**
 * Schedule Data Model & Rules Engine
 * Core business logic for scheduling system
 */

// ============================================
// DATA MODELS
// ============================================

/**
 * @typedef {Object} ScheduleEvent
 * @property {string} id - Unique identifier
 * @property {string} title - Display name
 * @property {'working_hours'|'break'|'lunch'|'vacation'|'sick_leave'|'day_off'} type
 * @property {string} start - ISO 8601 datetime
 * @property {string} end - ISO 8601 datetime
 * @property {string|null} recurring - 'weekly', 'once', null
 * @property {number[]} daysOfWeek - [0-6] for recurring events
 * @property {string} color - Hex color for display
 * @property {string} backgroundColor
 * @property {string} borderColor
 * @property {Object} rules - Rule configuration
 * @property {boolean} rules.isBlocking - Overrides working hours
 * @property {boolean} rules.isSubtractive - Reduces available hours
 * @property {number} rules.conflictPriority - Higher wins conflicts
 * @property {Object} extendedProps - Additional data
 */

/**
 * @typedef {Object} ScheduleState
 * @property {string} version
 * @property {string} timezone
 * @property {Object} settings
 * @property {ScheduleEvent[]} events
 * @property {Object} metadata
 */

// ============================================
// SCHEDULE ENGINE - CORE LOGIC
// ============================================

const ScheduleRules = {
  /**
   * Type configurations with priorities and visual settings
   */
  TYPE_CONFIG: {
    working_hours: {
      priority: 50,
      isBlocking: false,
      isSubtractive: false,
      color: '#27ae60',
      backgroundColor: 'rgba(39, 174, 96, 0.15)',
      borderColor: '#229954',
      icon: '💼'
    },
    break: {
      priority: 10,
      isBlocking: false,
      isSubtractive: true,
      color: '#f39c12',
      backgroundColor: 'rgba(243, 156, 18, 0.15)',
      borderColor: '#d68910',
      icon: '☕'
    },
    lunch: {
      priority: 10,
      isBlocking: false,
      isSubtractive: true,
      color: '#e67e22',
      backgroundColor: 'rgba(230, 126, 34, 0.15)',
      borderColor: '#ca6f1e',
      icon: '🍽️'
    },
    vacation: {
      priority: 99,
      isBlocking: true,
      isSubtractive: false,
      color: '#3498db',
      backgroundColor: 'rgba(52, 152, 219, 0.15)',
      borderColor: '#2980b9',
      icon: '🏖️'
    },
    sick_leave: {
      priority: 99,
      isBlocking: true,
      isSubtractive: false,
      color: '#9b59b6',
      backgroundColor: 'rgba(155, 89, 182, 0.15)',
      borderColor: '#8e44ad',
      icon: '🏥'
    },
    day_off: {
      priority: 95,
      isBlocking: true,
      isSubtractive: false,
      color: '#e74c3c',
      backgroundColor: 'rgba(231, 76, 60, 0.15)',
      borderColor: '#c0392b',
      icon: '❌'
    },
    booking: {
      priority: 30,
      isBlocking: false,
      isSubtractive: false,
      color: '#3498db',
      backgroundColor: 'rgba(52, 152, 219, 0.3)',
      borderColor: '#2980b9',
      icon: '🕒'
    }
  },

  /**
   * Get events that apply to a specific date
   */
  getEventsForDate(scheduleData, date) {
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay(); // 0=Sunday

    return scheduleData.events.filter(event => {
      // Single events
      if (event.recurring === 'once' || !event.recurring) {
        const eventDate = event.start.split('T')[0];
        return eventDate === dateStr;
      }

      // Recurring weekly events
      if (event.recurring === 'weekly') {
        return event.daysOfWeek && event.daysOfWeek.includes(dayOfWeek);
      }

      return false;
    });
  },

  /**
   * Resolve what happens at a specific time slot
   * Returns the highest-priority event at that time
   */
  resolveTimeSlot(events, hour) {
    const eventsAtTime = events.filter(evt => {
      const startHour = parseInt(evt.start.split('T')[1].split(':')[0]);
      const endHour = parseInt(evt.end.split('T')[1].split(':')[0]);
      return hour >= startHour && hour < endHour;
    });

    if (eventsAtTime.length === 0) {
      return null;
    }

    // Sort by priority (highest first)
    eventsAtTime.sort((a, b) => {
      const typeA = this.TYPE_CONFIG[a.type];
      const typeB = this.TYPE_CONFIG[b.type];
      return typeB.priority - typeA.priority;
    });

    return eventsAtTime[0];
  },

  /**
   * Calculate available hours for a date
   * Accounts for blocking events, working hours, and subtractive breaks
   */
  calculateAvailableHours(scheduleData, date) {
    const dayEvents = this.getEventsForDate(scheduleData, date);

    // Check for blocking events first
    const blockingEvent = dayEvents.find(e =>
      this.TYPE_CONFIG[e.type]?.isBlocking
    );

    if (blockingEvent) {
      return {
        available: 0,
        hours: [],
        reason: blockingEvent.type,
        blockedBy: blockingEvent.id
      };
    }

    // Get working hours
    const workingEvent = dayEvents.find(e => e.type === 'working_hours');

    if (!workingEvent) {
      return {
        available: 0,
        hours: [],
        reason: 'no_working_hours'
      };
    }

    const startHour = parseInt(workingEvent.start.split('T')[1].split(':')[0]);
    const endHour = parseInt(workingEvent.end.split('T')[1].split(':')[0]);
    let availableHours = endHour - startHour;

    // Subtract breaks and lunch
    const subtractiveEvents = dayEvents.filter(e =>
      this.TYPE_CONFIG[e.type]?.isSubtractive
    );

    const subtractedHours = {};
    subtractiveEvents.forEach(brk => {
      const brkStart = parseInt(brk.start.split('T')[1].split(':')[0]);
      const brkEnd = parseInt(brk.end.split('T')[1].split(':')[0]);
      const duration = brkEnd - brkStart;
      availableHours -= duration;

      for (let h = brkStart; h < brkEnd; h++) {
        subtractedHours[h] = brk.type;
      }
    });

    // Generate available hour slots
    const hours = [];
    for (let h = startHour; h < endHour; h++) {
      hours.push({
        hour: h,
        available: !subtractedHours[h],
        type: subtractedHours[h] || 'available'
      });
    }

    return {
      available: Math.max(0, availableHours),
      hours,
      totalHours: endHour - startHour,
      breakHours: Object.keys(subtractedHours).length
    };
  },

  /**
   * Check if a time slot can be booked
   */
  isTimeSlotAvailable(scheduleData, startDate, endDate) {
    const current = new Date(startDate);

    while (current <= endDate) {
      const availability = this.calculateAvailableHours(scheduleData, current);

      if (availability.available <= 0) {
        return {
          available: false,
          reason: availability.reason,
          blockedDate: current.toISOString().split('T')[0]
        };
      }

      current.setDate(current.getDate() + 1);
    }

    return { available: true };
  },

  /**
   * Get availability overview for a date range
   */
  getAvailabilityOverview(scheduleData, startDate, endDate) {
    const overview = {
      totalDays: 0,
      workingDays: 0,
      timeOffDays: 0,
      totalAvailableHours: 0,
      breakdown: {}
    };

    let current = new Date(startDate);

    while (current <= endDate) {
      overview.totalDays++;
      const dateStr = current.toISOString().split('T')[0];
      const availability = this.calculateAvailableHours(scheduleData, current);

      if (availability.available > 0) {
        overview.workingDays++;
        overview.totalAvailableHours += availability.available;
      } else {
        overview.timeOffDays++;
      }

      overview.breakdown[dateStr] = {
        available: availability.available,
        reason: availability.reason,
        hours: availability.hours
      };

      current.setDate(current.getDate() + 1);
    }

    return overview;
  }
};

// ============================================
// VALIDATION & NORMALIZATION
// ============================================

const ScheduleValidation = {
  /**
   * Validate event structure
   */
  validateEvent(event) {
    const errors = [];

    if (!event.id || typeof event.id !== 'string') {
      errors.push('Event must have string id');
    }

    if (!event.type || !ScheduleRules.TYPE_CONFIG[event.type]) {
      errors.push(`Invalid type: ${event.type}`);
    }

    if (!event.start || !event.end) {
      errors.push('Event must have start and end times');
    }

    try {
      const start = new Date(event.start);
      const end = new Date(event.end);

      if (start >= end) {
        errors.push('Start time must be before end time');
      }
    } catch (e) {
      errors.push('Invalid date format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Normalize event data - MINIMAL storage, derive colors at runtime
   */
  normalizeEvent(event) {
    const result = {
      id: event.id || `event_${Date.now()}`,
      title: event.title || 'Event',
      type: event.type || 'booking',
      start: event.start,
      end: event.end
    };

    // Only add extendedProps if there's actual data
    const props = event.extendedProps || {};
    const cleanProps = {};
    
    // Only include non-empty values
    if (props.customer) cleanProps.customer = props.customer;
    if (props.email) cleanProps.email = props.email;
    if (props.phone) cleanProps.phone = props.phone;
    if (props.services && props.services.length > 0) cleanProps.services = props.services;
    if (props.price && props.price > 0) cleanProps.price = props.price;
    if (props.duration && props.duration > 0) cleanProps.duration = props.duration;
    if (props.notes && props.notes.trim()) cleanProps.notes = props.notes.trim();
    if (props.worker) cleanProps.worker = props.worker;
    if (props.isBooking) cleanProps.isBooking = true;
    
    if (Object.keys(cleanProps).length > 0) {
      result.extendedProps = cleanProps;
    }

    return result;
  }
};

// ============================================
// EXPORTS
// ============================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ScheduleRules, ScheduleValidation };
}
