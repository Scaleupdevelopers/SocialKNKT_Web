import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Education } from './Education'
import { Location } from './Location'
import { WorkExperience } from './WorkExperience'
import { completeProfile, getCities, getCountries, getStates } from '../../action/action'
import { toast } from 'react-toastify'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }))
vi.mock('react-router-dom', async (original) => ({
  ...(await original()),
  useNavigate: () => navigate,
}))
vi.mock('../../action/action', () => ({
  completeProfile: vi.fn(),
  getCities: vi.fn(),
  getCountries: vi.fn(),
  getStates: vi.fn(),
}))
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => {
    resolve = yes
    reject = no
  })
  return { promise, resolve, reject }
}
function open(label) {
  fireEvent.click(
    within(screen.getByText(label, { exact: true }).parentElement).getByRole('button'),
  )
}
async function select(label, text) {
  await waitFor(() =>
    expect(
      within(screen.getByText(label, { exact: true }).parentElement).getByRole('button'),
    ).toBeEnabled(),
  )
  open(label)
  fireEvent.click(await within(screen.getByRole('listbox')).findByText(text, { exact: true }))
}
async function fillLocation() {
  await select('Country', 'Canada')
  await select('State', 'Ontario')
  await select('City', 'Toronto')
}
async function addEntry(name) {
  if (name === 'Education') {
    fireEvent.change(screen.getByLabelText('School / Institution Name'), {
      target: { value: 'Test School' },
    })
    fireEvent.change(screen.getByLabelText('Degree / Program'), {
      target: { value: 'Test Degree' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save Education' }))
  } else if (name === 'Location') {
    await fillLocation()
    fireEvent.click(screen.getByRole('button', { name: 'Save Location' }))
  } else {
    fireEvent.change(screen.getByLabelText('Job Title'), { target: { value: 'Engineer' } })
    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: 'Test Company' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Work Experience' }))
  }
}
beforeEach(() => {
  vi.resetAllMocks()
  getCountries.mockResolvedValue({
    data: [
      { id: 'ca', name: 'Canada' },
      { id: 'us', name: 'USA' },
    ],
  })
  getStates.mockResolvedValue({
    data: [
      { id: 'on', name: 'Ontario' },
      { id: 'qc', name: 'Quebec' },
    ],
  })
  getCities.mockResolvedValue({ data: [{ id: 'to', name: 'Toronto' }] })
  completeProfile.mockResolvedValue({ status: true })
})

it('sends string education years, preserves them through editing, and omits date keys', async () => {
  render(
    <MemoryRouter>
      <Education />
    </MemoryRouter>,
  )
  await select('Start Year', '2020')
  await select('End Year', '2024')
  await addEntry('Education')
  fireEvent.click(screen.getByRole('button', { name: 'Edit education' }))
  expect(
    within(screen.getByText('Start Year').parentElement).getByRole('button'),
  ).toHaveTextContent('2020')
  fireEvent.click(screen.getByRole('button', { name: 'Save Education' }))
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await waitFor(() => expect(completeProfile).toHaveBeenCalledOnce())
  const entry = completeProfile.mock.calls[0][0].education[0]
  expect(entry).toMatchObject({ startYear: '2020', endYear: '2024' })
  expect(entry).not.toHaveProperty('startDate')
  expect(entry).not.toHaveProperty('endDate')
})

it('sends an empty endYear for current education', async () => {
  render(
    <MemoryRouter>
      <Education />
    </MemoryRouter>,
  )
  await select('End Year', '2024')
  fireEvent.click(screen.getByRole('checkbox'))
  await addEntry('Education')
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await waitFor(() => expect(completeProfile).toHaveBeenCalledOnce())
  expect(completeProfile.mock.calls[0][0].education[0]).toMatchObject({
    endYear: '',
    currentlyStudying: true,
  })
})

it('preserves country identity and name when current location is toggled', async () => {
  render(
    <MemoryRouter>
      <Location />
    </MemoryRouter>,
  )
  await fillLocation()
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Save Location' }))
  expect(screen.getByText('Toronto, Ontario, Canada')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Edit location' }))
  expect(
    within(screen.getByText('Country').parentElement).getByRole('button'),
  ).toHaveTextContent('Canada')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByRole('button', { name: 'Save Location' }))
  expect(screen.getByText('Toronto, Ontario, Canada')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await waitFor(() => expect(completeProfile).toHaveBeenCalledOnce())
  expect(completeProfile.mock.calls[0][0].placesLived[0]).toMatchObject({
    countryId: 'ca',
    stateId: 'on',
    cityId: 'to',
    currentlyLiving: false,
  })
})

describe.each([
  ['Education', Education, '/location'],
  ['Location', Location, '/pronunciation'],
  ['WorkExperience', WorkExperience, '/education'],
])('%s async boundaries', (name, Component, nextPath) => {
  it('shows field shimmers beside stable disabled geography controls', async () => {
    const requests = [deferred(), deferred(), deferred()]
    getCountries.mockReturnValue(requests[0].promise)
    getStates.mockReturnValue(requests[1].promise)
    getCities.mockReturnValue(requests[2].promise)
    render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    const fields = [
      ['Country', 'Canada', 'ca'],
      ['State', 'Ontario', 'on'],
      ['City', 'Toronto', 'to'],
    ]
    for (const [index, [label, option, id]] of fields.entries()) {
      const control = within(screen.getByText(label).parentElement).getByRole('button')
      expect(control).toBeDisabled()
      expect(control).toHaveTextContent(`Select ${label.toLowerCase()}`)
      const skeleton = screen.getByRole('status', { name: `Loading ${label.toLowerCase()}…` })
      expect(skeleton).toHaveClass('loading-skeleton-field')
      expect(skeleton.querySelector('.loading-skeleton-label')).toHaveTextContent('Loading')
      await act(async () => requests[index].resolve({ data: [{ id, name: option }] }))
      expect(skeleton).not.toBeInTheDocument()
      await select(label, option)
    }
  })

  it.each([
    ['countries', getCountries, 'Country', 'Canada'],
    ['states', getStates, 'State', 'Ontario'],
    ['cities', getCities, 'City', 'Toronto'],
  ])(
    'retries failed %s without losing the draft or parent selection',
    async (kind, request, label, option) => {
      request.mockRejectedValueOnce(new Error('private load details'))
      render(
        <MemoryRouter>
          <Component />
        </MemoryRouter>,
      )
      const draftInput = screen.queryAllByRole('textbox')[0]
      if (draftInput) fireEvent.change(draftInput, { target: { value: 'Keep my draft' } })
      fireEvent.click(screen.getByRole('checkbox'))
      if (kind !== 'countries') await select('Country', 'Canada')
      if (kind === 'cities') await select('State', 'Ontario')
      const retry = await screen.findByRole('button', { name: `Retry ${kind}` })
      expect(screen.getByRole('alert')).not.toHaveTextContent('private load details')
      fireEvent.click(retry)
      await select(label, option)
      expect(request).toHaveBeenCalledTimes(2)
      expect(screen.getByRole('checkbox')).toBeChecked()
      if (draftInput) expect(draftInput).toHaveValue('Keep my draft')
      expect(screen.queryByRole('button', { name: `Retry ${kind}` })).not.toBeInTheDocument()
      if (kind !== 'countries') {
        expect(
          within(screen.getByText('Country').parentElement).getByRole('button'),
        ).toHaveTextContent('Canada')
        expect(getCountries).toHaveBeenCalledTimes(1)
      }
      if (kind === 'states') expect(request).toHaveBeenLastCalledWith({ countryId: 'ca' })
      if (kind === 'cities') {
        expect(request).toHaveBeenLastCalledWith({ countryId: 'ca', stateId: 'on' })
        expect(getStates).toHaveBeenCalledTimes(1)
      }
    },
  )

  it('ignores a retry response when its country has changed', async () => {
    const retry = deferred()
    getStates.mockRejectedValueOnce(new Error('failed')).mockReturnValueOnce(retry.promise)
    render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    await select('Country', 'Canada')
    fireEvent.click(await screen.findByRole('button', { name: 'Retry states' }))
    await select('Country', 'USA')
    await act(async () => retry.resolve({ data: [{ id: 'old', name: 'Stale state' }] }))
    open('State')
    expect(
      within(screen.getByRole('listbox')).queryByText('Stale state'),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry states' })).not.toBeInTheDocument()
  })

  it('ignores stale state responses after changing country', async () => {
    const old = deferred()
    const latest = deferred()
    getStates.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    await select('Country', 'Canada')
    await select('Country', 'USA')
    await act(async () => latest.resolve({ data: [{ id: 'ny', name: 'New York' }] }))
    await act(async () => old.resolve({ data: [{ id: 'on', name: 'Ontario' }] }))
    open('State')
    expect(within(screen.getByRole('listbox')).getByText('New York')).toBeInTheDocument()
    expect(within(screen.getByRole('listbox')).queryByText('Ontario')).not.toBeInTheDocument()
  })

  it('ignores stale city responses after changing state', async () => {
    const old = deferred()
    const latest = deferred()
    getCities.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    await select('Country', 'Canada')
    await select('State', 'Ontario')
    await select('State', 'Quebec')
    await act(async () => latest.resolve({ data: [{ id: 'mt', name: 'Montreal' }] }))
    await act(async () => old.resolve({ data: [{ id: 'to', name: 'Toronto' }] }))
    open('City')
    expect(within(screen.getByRole('listbox')).getByText('Montreal')).toBeInTheDocument()
    expect(within(screen.getByRole('listbox')).queryByText('Toronto')).not.toBeInTheDocument()
  })

  it('ignores obsolete errors and errors after unmount', async () => {
    const old = deferred()
    const latest = deferred()
    getStates.mockReturnValueOnce(old.promise).mockReturnValueOnce(latest.promise)
    const view = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    await select('Country', 'Canada')
    await select('Country', 'USA')
    await act(async () => old.reject(new Error('sensitive old failure')))
    expect(toast.error).not.toHaveBeenCalled()
    view.unmount()
    await act(async () => latest.reject(new Error('sensitive late failure')))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('suppresses late country failures after unmount', async () => {
    const countries = deferred()
    getCountries.mockReturnValue(countries.promise)
    const view = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    view.unmount()
    await act(async () => countries.reject(new Error('private details')))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('suppresses city failures after unmount', async () => {
    const cities = deferred()
    getCities.mockReturnValue(cities.promise)
    const view = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    await select('Country', 'Canada')
    await select('State', 'Ontario')
    view.unmount()
    await act(async () => cities.reject(new Error('private city failure')))
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('shows a stable load error instead of server details', async () => {
    getCountries.mockRejectedValue(new Error('private country failure'))
    render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Unable to load countries. Please try again.'),
    )
  })

  it('treats an explicit unsuccessful save as failure and allows retry', async () => {
    completeProfile.mockResolvedValueOnce({ status: false, message: 'private details' })
    render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    await addEntry(name)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Please try again.')),
    )
    expect(navigate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(nextPath))
  })

  it('locks duplicate saves synchronously and permits retry after failure', async () => {
    const save = deferred()
    completeProfile.mockReturnValueOnce(save.promise)
    render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    await addEntry(name)
    const button = screen.getByRole('button', { name: 'Continue' })
    act(() => {
      button.click()
      button.click()
    })
    expect(completeProfile).toHaveBeenCalledOnce()
    await act(async () => save.reject(new Error('private details')))
    expect(navigate).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Please try again.'))
    expect(toast.error).not.toHaveBeenCalledWith(expect.stringContaining('private'))
    fireEvent.click(button)
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(nextPath))
    expect(completeProfile).toHaveBeenCalledTimes(2)
  })

  it('does not navigate or toast when a save resolves after unmount', async () => {
    const save = deferred()
    completeProfile.mockReturnValue(save.promise)
    const view = render(
      <MemoryRouter>
        <Component />
      </MemoryRouter>,
    )
    await addEntry(name)
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    view.unmount()
    await act(async () => save.resolve({ status: true }))
    expect(navigate).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
