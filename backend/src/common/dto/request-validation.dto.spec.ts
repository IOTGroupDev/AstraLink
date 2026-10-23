import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import {
  CreateChartRequestDto,
  CreateConnectionDto,
  UpdateProfileDto,
} from './request-validation.dto';

describe('runtime request validation', () => {
  const options = { whitelist: true, forbidNonWhitelisted: true };
  it('keeps the profile-backed empty chart request supported', () => {
    expect(
      validateSync(
        plainToInstance(CreateChartRequestDto, { data: {} }),
        options,
      ),
    ).toHaveLength(0);
  });
  it('validates nested birth fields rather than accepting arbitrary chart JSON', () => {
    const dto = plainToInstance(CreateChartRequestDto, {
      data: { birthDate: '2026-99-99', birthTime: '99:99', latitude: 91 },
    });
    expect(validateSync(dto, options)).not.toHaveLength(0);
  });
  it('rejects caller-supplied role and invalid birth dates in profile updates', () => {
    const dto = plainToInstance(UpdateProfileDto, {
      role: 'admin',
      birthDate: '2026-02-30',
    });
    expect(validateSync(dto, options).map((error) => error.property)).toEqual(
      expect.arrayContaining(['role', 'birthDate']),
    );
  });
  it('requires validated nested data for a connection', () => {
    const dto = plainToInstance(CreateConnectionDto, {
      targetName: 'Other',
      targetData: {
        birthDate: '2000-01-01',
        birthTime: '12:00',
        latitude: 999,
      },
    });
    expect(validateSync(dto, options)).not.toHaveLength(0);
  });
});
