export class BirthDataChangedEvent {
  constructor(
    public readonly userId: number,
    public readonly changes: {
      birthPlace?: {
        old: string | null;
        new: string | null;
      };
      birthTime?: {
        old: string | null;
        new: string | null;
      };
    },
    public readonly timestamp: Date = new Date(),
  ) {}

  /**
   * Returns true if any birth data field was changed
   */
  hasBirthDataChanges(): boolean {
    return !!(this.changes.birthPlace || this.changes.birthTime);
  }

  /**
   * Returns array of changed field names
   */
  getChangedFields(): string[] {
    const fields: string[] = [];
    if (this.changes.birthPlace) fields.push('birthPlace');
    if (this.changes.birthTime) fields.push('birthTime');
    return fields;
  }
}
