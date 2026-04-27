update public.dating_matches
set candidate_data =
  candidate_data
  - 'email'
  - 'birthDate'
  - 'birthTime'
  - 'birthPlace'
  - 'birth_date'
  - 'birth_time'
  - 'birth_place'
  - 'birth_date_encrypted'
  - 'birth_time_encrypted'
  - 'birth_place_encrypted'
where candidate_data ?| array[
  'email',
  'birthDate',
  'birthTime',
  'birthPlace',
  'birth_date',
  'birth_time',
  'birth_place',
  'birth_date_encrypted',
  'birth_time_encrypted',
  'birth_place_encrypted'
];
