import {
  buildAdvisorEvaluatePayload,
  chooseAdvisorQuickDate,
  confirmAdvisorCustomDate,
  createInitialAdvisorChatState,
  createNextAdvisorChatState,
  deriveAdvisorSessionRevealState,
  pruneAdvisorChatState,
  selectAdvisorTopic,
  submitAdvisorPrompt,
  updateAdvisorCustomDate,
  updateAdvisorPromptDraft,
} from '../advisorChatState';

describe('advisorChatState', () => {
  it('creates an initial chat state with one active session', () => {
    const state = createInitialAdvisorChatState(
      new Date('2026-03-25T12:00:00.000Z'),
      1
    );

    expect(state.sessions).toHaveLength(1);
    expect(state.activeSessionId).toBe('advisor-session-1');
    expect(state.sessions[0]?.status).toBe('choose_topic');
  });

  it('moves from topic selection to prompt submission with a quick date', () => {
    const initial = createInitialAdvisorChatState(
      new Date('2026-03-25T12:00:00.000Z'),
      10
    ).sessions[0]!;

    const withTopic = selectAdvisorTopic(initial, 'meeting', 11);
    const withDate = chooseAdvisorQuickDate(
      withTopic,
      'nextWeek',
      new Date('2026-03-25T12:00:00.000Z'),
      12
    );
    const withDraft = updateAdvisorPromptDraft(
      withDate,
      'Need advice before an investor call',
      13
    );
    const submitted = submitAdvisorPrompt(withDraft, 14);

    expect(withTopic.status).toBe('choose_date');
    expect(withDate.date).toBe('2026-04-01');
    expect(withDate.status).toBe('write_prompt');
    expect(submitted.status).toBe('loading');
    expect(
      buildAdvisorEvaluatePayload(submitted, 'Europe/Minsk')
    ).toMatchObject({
      topic: 'meeting',
      date: '2026-04-01',
      timezone: 'Europe/Minsk',
      customNote: 'Need advice before an investor call',
    });
  });

  it('confirms a custom date from wheel picker state', () => {
    const initial = createInitialAdvisorChatState(
      new Date('2026-03-25T12:00:00.000Z'),
      20
    ).sessions[0]!;

    const withTopic = selectAdvisorTopic(initial, 'travel', 21);
    const withCustomDate = updateAdvisorCustomDate(
      { ...withTopic, customDateOpen: true },
      { day: 7, month: 5, year: 2026 },
      22
    );
    const confirmed = confirmAdvisorCustomDate(withCustomDate, 23);

    expect(confirmed.date).toBe('2026-05-07');
    expect(confirmed.customDateOpen).toBe(false);
    expect(confirmed.status).toBe('write_prompt');
  });

  it('collapses completed sessions and drops unfinished drafts on new request', () => {
    const initialState = createInitialAdvisorChatState(
      new Date('2026-03-25T12:00:00.000Z'),
      30
    );
    const completedSession = {
      ...initialState.sessions[0]!,
      topic: 'contract' as const,
      date: '2026-03-25',
      prompt: 'Review the timing for signing',
      promptDraft: 'Review the timing for signing',
      status: 'completed' as const,
      result: {
        verdict: 'good' as const,
        color: '#10B981',
        score: 88,
        factors: [],
        aspects: [],
        houses: [],
        bestWindows: [],
        recommendations: [],
        explanation: 'Looks favorable.',
        generatedBy: 'rules',
        evaluatedAt: '2026-03-25T12:00:00.000Z',
        date: '2026-03-25',
        topic: 'contract',
      },
      errorMessage: null,
    };

    const nextState = createNextAdvisorChatState(
      {
        sessions: [completedSession],
        activeSessionId: completedSession.id,
      },
      new Date('2026-03-26T12:00:00.000Z'),
      31
    );

    expect(nextState.sessions).toHaveLength(2);
    expect(nextState.sessions[0]?.collapsed).toBe(true);
    expect(nextState.sessions[1]?.status).toBe('choose_topic');
    expect(nextState.activeSessionId).toBe('advisor-session-31');
  });

  it('prunes the oldest sessions while keeping the active one', () => {
    const sessions = Array.from({ length: 4 }, (_, index) => ({
      ...createInitialAdvisorChatState(
        new Date('2026-03-25T12:00:00.000Z'),
        index + 1
      ).sessions[0]!,
      id: `advisor-session-${index + 1}`,
      createdAt: index + 1,
      updatedAt: index + 1,
      status: 'completed' as const,
    }));

    const pruned = pruneAdvisorChatState(
      {
        sessions,
        activeSessionId: 'advisor-session-4',
      },
      2
    );

    expect(pruned.sessions.map((session) => session.id)).toEqual([
      'advisor-session-3',
      'advisor-session-4',
    ]);
    expect(pruned.activeSessionId).toBe('advisor-session-4');
  });

  it('restores reveal state for a saved session that is ready for prompt input', () => {
    const session = chooseAdvisorQuickDate(
      selectAdvisorTopic(
        createInitialAdvisorChatState(new Date('2026-03-25T12:00:00.000Z'), 100)
          .sessions[0]!,
        'travel',
        101
      ),
      'tomorrow',
      new Date('2026-03-25T12:00:00.000Z'),
      102
    );

    expect(deriveAdvisorSessionRevealState(session)).toEqual({
      topicAck: true,
      datePrompt: true,
      dateChoices: false,
      dateAck: true,
      promptRequest: true,
      promptInput: true,
    });
  });
});
