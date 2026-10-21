import { act, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import { i18n, initI18n } from '../../src/renderer/src/core/i18n'
import { useToastStore } from '../../src/renderer/src/core/toast/store'
import { ToastHost } from '../../src/renderer/src/shell/overlays/ToastHost'

describe('ToastHost', () => {
  beforeAll(async () => {
    await initI18n('en-US')
  })

  it('renders a toast from the store', async () => {
    render(
      <I18nextProvider i18n={i18n}>
        <ToastHost />
      </I18nextProvider>
    )
    act(() => {
      useToastStore.getState().notify('Saved successfully', 'success')
    })
    expect(await screen.findByText('Saved successfully')).toBeInTheDocument()
  })
})
