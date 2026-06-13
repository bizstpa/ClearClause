import { describe, expect, it } from 'vitest';
import { dataCollection } from './data-collection';

describe('data_collection detector', () => {
  it('flags ordinary collected fields as info', () => {
    const matches = dataCollection.detect(
      'We collect your name, email address, and phone number when you create an account.',
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('info');
  });

  it('ranks SSN and government IDs as warning', () => {
    const matches = dataCollection.detect(
      "We may collect your Social Security number, driver's license number, or passport number.",
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('warning');
  });

  it('ranks financial and medical information as warning', () => {
    expect(dataCollection.detect('Bank account or credit card numbers.')[0]?.severity).toBe(
      'warning',
    );
    expect(
      dataCollection.detect('We process medical information and health insurance details.')[0]
        ?.severity,
    ).toBe('warning');
  });

  it('ranks bare sensitive list lines as warning', () => {
    const text =
      'Biometric information\nCharacteristics of protected classifications, such as race or national origin\nPrecise geolocation data derived from GPS, Bluetooth, or WiFi signals';
    const matches = dataCollection.detect(text);
    expect(matches).toHaveLength(3);
    expect(matches.every((m) => m.severity === 'warning')).toBe(true);
  });

  it('ranks session-replay, keystroke capture, and profiling as warning', () => {
    expect(
      dataCollection.detect('We use session-replay tools that capture keystrokes and mouse movements.')[0]
        ?.severity,
    ).toBe('warning');
    expect(
      dataCollection.detect(
        "Inferences drawn from the information above to create a profile reflecting a consumer's preferences and behavior.",
      )[0]?.severity,
    ).toBe('warning');
  });

  it('orders sensitive matches before ordinary ones', () => {
    const text =
      'We collect your name and email address.\nWe also collect biometric identifiers for login.';
    const matches = dataCollection.detect(text);
    expect(matches).toHaveLength(2);
    expect(matches[0].severity).toBe('warning');
    expect(matches[1].severity).toBe('info');
  });

  it('does not flag a denial of sensitive collection or use', () => {
    expect(
      dataCollection.detect(
        'We don’t show you personalized ads based on sensitive categories, such as race, religion, sexual orientation, or health.',
      ),
    ).toHaveLength(0);
    expect(
      dataCollection.detect('We do not collect your Social Security number or biometric data.'),
    ).toHaveLength(0);
  });

  it('does not flag a denial of a sensitive activity ("do not engage in profiling")', () => {
    expect(
      dataCollection.detect('We do not engage in profiling of consumers as defined under applicable law.'),
    ).toHaveLength(0);
    expect(dataCollection.detect('We do not track your precise geolocation.')).toHaveLength(0);
  });

  it('still flags an affirmative sensitive collection as warning', () => {
    const matches = dataCollection.detect('We collect your race and health information.');
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('warning');
  });

  it('still flags an affirmative profiling assertion as warning', () => {
    const matches = dataCollection.detect(
      'We engage in profiling to build a profile about you and your preferences.',
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].severity).toBe('warning');
  });

  it('does not flag ordinary nouns outside a collection context', () => {
    expect(dataCollection.detect('Email us with questions about your order.')).toHaveLength(0);
    expect(dataCollection.detect('We collect rainwater at our facilities.')).toHaveLength(0);
  });
});
