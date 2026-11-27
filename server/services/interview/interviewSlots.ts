// @ts-nocheck
export class InterviewSlotsHelper {
  static generateTimeSlots(count = 5) {
    const slots = [];
    const now = new Date();
    let currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + 1); // Start from tomorrow

    const timeOptions = ['10:00 AM', '2:00 PM', '4:00 PM'];
    let slotCount = 0;

    while (slotCount < count) {
      // Skip weekends
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        const time = timeOptions[slotCount % timeOptions.length];
        const [hours, period] = time.split(' ');
        let [h, m] = hours.split(':').map(Number);

        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;

        const start = new Date(currentDate);
        start.setHours(h, m, 0, 0);

        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 45);

        slots.push({
          start: start.toISOString(),
          end: end.toISOString(),
          day: this.getDayName(currentDate),
          date: currentDate.toISOString().split('T')[0],
          time,
        });

        slotCount++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Generate alternative slots (different times)
   */
  static generateAlternativeSlots() {
    const slots = [];
    const now = new Date();
    let currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + 3); // Start 3 days from now

    const timeOptions = ['9:00 AM', '11:00 AM', '3:30 PM'];

    for (let i = 0; i < 3; i++) {
      // Skip weekends
      while (currentDate.getDay() === 0 || currentDate.getDay() === 6) {
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const time = timeOptions[i];
      const [hours, period] = time.split(' ');
      let [h, m] = hours.split(':').map(Number);

      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;

      const start = new Date(currentDate);
      start.setHours(h, m, 0, 0);

      const end = new Date(start);
      end.setMinutes(end.getMinutes() + 45);

      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        day: this.getDayName(currentDate),
        date: currentDate.toISOString().split('T')[0],
        time,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return slots;
  }

  /**
   * Format slot for display
   */
  static formatSlot(slot) {
    if (typeof slot === 'string') {
      return slot; // Already formatted
    }

    return `${slot.day} (${slot.date}) at ${slot.time}`;
  }

  /**
   * Format date and time
   */
  static formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  /**
   * Get day name from date
   */
  static getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  }

  /**
   * Generate unique meeting ID
   */
  static generateMeetingId() {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Format phone number for WhatsApp
   */
  static formatPhoneForWhatsApp(phone) {
    if (!phone) return '';

    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');

    // Handle UAE numbers
    if (cleaned.startsWith('971')) {
      return `+${cleaned}`;
    }

    if (cleaned.startsWith('05')) {
      return `+971${cleaned.substring(1)}`;
    }

    if (cleaned.startsWith('50') || cleaned.startsWith('52') || cleaned.startsWith('54') || cleaned.startsWith('55') || cleaned.startsWith('56') || cleaned.startsWith('58')) {
      return `+971${cleaned}`;
    }

    // Handle other formats
    if (cleaned.length === 9) {
      return `+971${cleaned}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Extract decline reason from message
   */
  static extractDeclineReason(message) {
    if (/busy|don't have time|schedule|can't/i.test(message)) {
      return 'Scheduling conflict';
    }
    if (/interested|right role|looking for/i.test(message)) {
      return 'Not interested in role';
    }
    if (/already found|other job|accepted/i.test(message)) {
      return 'Already accepted another offer';
    }
    return 'Candidate declined';
  }

  /**
   * Get interview statistics
   */
}
