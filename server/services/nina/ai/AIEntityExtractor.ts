// @ts-nocheck
import { EventEmitter } from 'events';

export class AIEntityExtractor extends EventEmitter {
  constructor() {
    super();
    this.patterns = {
      phone: {
        regex: /(?:\+971|00971|971)?[\s-]?(?:5[0-9]|4[0-9])[\s-]?\d{3}[\s-]?\d{4}/g,
        type: 'phone_uae'
      },
      email: {
        regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        type: 'email'
      },
      price: {
        regex: /(?:aed|dhs?)?\s*[\d,]+(?:\s*(?:k|m|million|thousand))?/gi,
        type: 'price'
      },
      bedrooms: {
        regex: /(\d+)\s*(?:bed|br|bedroom|bhk)/gi,
        type: 'bedrooms'
      },
      area: {
        regex: /(?:palm|marina|downtown|jvc|jlt|business bay|difc|silicon oasis|arabian ranches|jumeirah|emirates hills|creek harbour)/gi,
        type: 'location'
      },
      propertyType: {
        regex: /(?:villa|apartment|studio|townhouse|penthouse|duplex|loft|office|retail|warehouse)/gi,
        type: 'property_type'
      },
      date: {
        regex: /(?:today|tomorrow|next week|this weekend|\d{1,2}[\/\-]\d{1,2}[\/\-]?\d{0,4})/gi,
        type: 'date'
      }
    };
  }

  extract(text) {
    const entities = [];

    for (const [, config] of Object.entries(this.patterns)) {
      const matches = text.match(config.regex);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type: config.type,
            value: match.trim(),
            normalized: this.normalize(config.type, match),
            position: text.indexOf(match)
          });
        }
      }
    }

    entities.sort((a, b) => a.position - b.position);

    return {
      entities,
      count: entities.length,
      types: [...new Set(entities.map(e => e.type))],
      timestamp: new Date().toISOString()
    };
  }

  normalize(type, value) {
    switch (type) {
      case 'phone_uae':
        return value.replace(/[\s\-]/g, '').replace(/^00/, '+').replace(/^971/, '+971');
      case 'price': {
        const num = value.replace(/[^\d]/g, '');
        if (/million|m$/i.test(value)) return parseInt(num, 10) * 1000000;
        if (/thousand|k$/i.test(value)) return parseInt(num, 10) * 1000;
        return parseInt(num, 10);
      }
      case 'bedrooms':
        return parseInt(value.match(/\d+/)[0], 10);
      default:
        return value.toLowerCase().trim();
    }
  }
}
