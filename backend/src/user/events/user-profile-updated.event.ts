export class UserProfileUpdatedEvent {
  constructor(
    public readonly userId: number,
    public readonly oldData: {
      name?: string | null;
      birthPlace?: string | null;
      birthTime?: string | null;
    },
    public readonly newData: {
      name?: string | null;
      birthPlace?: string | null;
      birthTime?: string | null;
    },
    public readonly timestamp: Date = new Date(),
  ) {}
}
