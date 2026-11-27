import { describe, expect, it } from 'vitest'
import { buildPayload, createDraft, validateDraft } from './profileDraft'

const profile = {
  bio: 'Keep bio',
  website: 'https://example.org',
  fname: 'Sam',
  image: '/fallback.png',
  workExperiences: [
    { id: 'a', userId: 'u', jobTitle: 'Designer', companyName: 'A', createdAt: 1 },
    { id: 'b', jobTitle: 'Engineer', companyName: 'B' },
  ],
  educations: [{ school: 'College', startYear: '2018', endYear: '2022' }],
}
describe('profile replacement payloads', () => {
  it('preserves sibling entries and scalar fields, excludes server-owned fields', () => {
    const draft = createDraft(profile, 'work')
    draft[0].jobTitle = 'Lead'
    expect(buildPayload('work', draft, profile)).toEqual({
      bio: profile.bio,
      website: profile.website,
      workExperience: [
        { jobTitle: 'Lead', companyName: 'A' },
        { jobTitle: 'Engineer', companyName: 'B' },
      ],
    })
    expect(profile.workExperiences[0].jobTitle).toBe('Designer')
  })
  it('only clears the selected collection', () => {
    expect(buildPayload('work', [], profile)).toEqual({
      bio: profile.bio,
      website: profile.website,
      workExperience: [],
    })
  })
  it('uses model education year keys', () => {
    expect(
      buildPayload('education', createDraft(profile, 'education'), profile).education,
    ).toEqual(profile.educations)
  })
  it('does not persist normalized fallback image when changing resume', () => {
    expect(
      buildPayload(
        'media',
        { ...createDraft(profile, 'media'), resume: 'https://example.org/cv.pdf' },
        profile,
      ),
    ).toEqual({
      bio: profile.bio,
      website: profile.website,
      resume: 'https://example.org/cv.pdf',
    })
  })
  it('supports explicitly removing resume and media arrays', () => {
    const source = { ...profile, resume: 'cv.pdf', headshot: ['photo.png'] }
    expect(
      buildPayload(
        'media',
        { ...createDraft(source, 'media'), resume: '', headshot: [] },
        source,
      ),
    ).toMatchObject({ resume: '', headshot: [] })
  })
  it('allows clearing pronunciation without replacing unrelated fields', () => {
    const draft = { phonetic_spelling: '', record_name: '' }
    expect(validateDraft('pronunciation', draft, profile)).toBe('')
    expect(buildPayload('pronunciation', draft, profile)).toEqual(draft)
  })
  it('rejects unsupported basic clears and reversed dates', () => {
    expect(
      validateDraft(
        'work',
        [
          {
            jobTitle: 'Designer',
            companyName: 'A',
            startDate: '2024-01-01',
            endDate: '2023-01-01',
          },
        ],
        profile,
      ),
    ).toContain('End date')
    expect(
      validateDraft('basic', { ...createDraft(profile, 'basic'), fname: '' }, profile),
    ).toContain('cannot be cleared')
  })
})
