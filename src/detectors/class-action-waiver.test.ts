import { describe, expect, it } from 'vitest';
import { classActionWaiver } from './class-action-waiver';

describe('class_action_waiver detector', () => {
  it('flags an explicit class action waiver', () => {
    const matches = classActionWaiver.detect(
      'You and the Company agree that each may bring claims against the other only on an individual basis and waive any right to participate in a class action.',
    );
    expect(matches).toHaveLength(1);
  });

  it('flags "not as a plaintiff or class member" phrasing', () => {
    const matches = classActionWaiver.detect(
      'You may bring claims only in your individual capacity, and not as a plaintiff or class member in any purported class proceeding.',
    );
    expect(matches).toHaveLength(1);
  });

  it('does not flag innocent "individual basis" sentences', () => {
    expect(
      classActionWaiver.detect('Each deletion request is reviewed on an individual basis.'),
    ).toHaveLength(0);
  });

  it('does not flag unrelated mentions of classes', () => {
    expect(
      classActionWaiver.detect('We offer a class of premium features for subscribers.'),
    ).toHaveLength(0);
  });

  it('handles the Arabic starter patterns', () => {
    expect(
      classActionWaiver.detect('توافق على عدم المشاركة في أي دعوى جماعية ضد الشركة.'),
    ).toHaveLength(1);
  });
});
