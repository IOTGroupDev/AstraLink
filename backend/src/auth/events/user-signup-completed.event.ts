/**
 * Event emitted when user completes signup with birth data
 * This triggers natal chart creation in ChartModule
 */
export class UserSignupCompletedEvent {
  constructor(
    public readonly userId: string,
    public readonly birthData: {
      birthDate: string;
      birthTime: string;
      birthPlace: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    },
  ) {}
}
