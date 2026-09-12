/**
 * Toast + centered dialog helpers for the solution-explorer panel.
 *
 * The toast is a plain element with `textContent`; the dialog is a React
 * component rendered through a root on a body-level host, so nothing here
 * assembles HTML strings.
 * @module dsh-solution-explorer/client/shared/ui
 */
import { createElement as h, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'

let toastTimer: ReturnType<typeof setTimeout> | null = null

/** Lightweight bottom-right toast; never a blocking dialog. */
export function showToast(msg: string, isError = false): void {
  let el = document.getElementById("sol-exp-toast")
  if (!el) {
    el = document.createElement("div")
    el.id = "sol-exp-toast"
    el.style.cssText = "position:fixed;bottom:16px;right:16px;z-index:99999;max-width:340px;max-height:200px;overflow:auto;padding:8px 12px;border-radius:6px;background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-3,#1e1e1e));border:1px solid var(--dsw-alias-border-l2,#333);font-size:12px;box-shadow:0 4px 16px rgba(0,0,0,0.35);white-space:pre-wrap;word-break:break-all;transition:opacity .3s;"
    document.body.appendChild(el)
  }
  el.textContent = msg
  el.style.color = isError ? "var(--dsw-color-error,#f48771)" : "var(--dsw-alias-label-primary,#d4d4d4)"
  el.style.opacity = "1"
  clearTimeout(toastTimer as ReturnType<typeof setTimeout>)
  toastTimer = setTimeout(() => { el!.style.opacity = "0"; setTimeout(() => el!.remove(), 400) }, 4000)
}

// ─── Centered DSH-style dialogs ─────────────────────────────────
// Replaces native window.confirm/window.prompt with an in-page React modal
// styled with the same --dsw-alias-* tokens as the rest of the panel.

/** Options accepted by {@link showDialog}. */
export interface DialogOptions {
  title?: string
  message?: string
  input?: boolean
  inputValue?: string
  placeholder?: string
  okText?: string
  cancelText?: string
  danger?: boolean
}

/** One dialog occurrence: options plus the localized button labels. */
function Dialog({ opts, okText, cancelText, onFinish }: {
  opts: DialogOptions
  okText: string
  cancelText: string
  onFinish(value: string | boolean | null): void
}): ReactNode {
  const isPrompt = opts.input === true
  const inputRef = useRef<HTMLInputElement | null>(null)
  const okRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (isPrompt) { inputRef.current?.focus(); inputRef.current?.select() }
    else okRef.current?.focus()
  }, [isPrompt])

  const done = (value: string | boolean | null): void => onFinish(value)

  return h('div', {
    className: 'sol-exp-modal-mask',
    onKeyDown: (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); done(isPrompt ? null : false) }
      else if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); done(isPrompt ? (inputRef.current?.value ?? null) : true) }
    },
    onMouseDown: (e) => { if (e.target === e.currentTarget) done(isPrompt ? null : false) },
  },
    h('div', { className: 'sol-exp-modal-box', role: 'dialog', 'aria-modal': true },
      opts.title ? h('div', { className: 'sol-exp-modal-title' }, opts.title) : null,
      opts.message ? h('div', { className: 'sol-exp-modal-message' }, opts.message) : null,
      isPrompt
        ? h('input', {
            ref: inputRef,
            className: 'sol-exp-modal-input',
            defaultValue: opts.inputValue || '',
            placeholder: opts.placeholder || '',
          })
        : null,
      h('div', { className: 'sol-exp-modal-actions' },
        h('button', { type: 'button', className: 'sol-exp-modal-btn', onClick: () => done(isPrompt ? null : false) }, cancelText),
        h('button', {
          ref: okRef,
          type: 'button',
          className: 'sol-exp-modal-btn ' + (opts.danger ? 'danger' : 'primary'),
          onClick: () => done(isPrompt ? (inputRef.current?.value ?? null) : true),
        }, okText)),
    ),
  )
}

let dialogHost: HTMLElement | null = null
let dialogRoot: Root | null = null

/** Show a centered confirm/prompt dialog; resolves with the chosen value. */
export function showDialog(opts: DialogOptions): Promise<string | boolean | null> {
  return new Promise((resolve) => {
    const zh = document.documentElement.lang?.startsWith("zh")
    const isPrompt = opts.input === true
    const okText = opts.okText || (zh ? "确定" : "OK")
    const cancelText = opts.cancelText || (zh ? "取消" : "Cancel")
    if (dialogHost === null) {
      dialogHost = document.createElement("div")
      document.body.appendChild(dialogHost)
      dialogRoot = createRoot(dialogHost)
    }
    let settled = false
    const finish = (value: string | boolean | null): void => {
      if (settled) return
      settled = true
      // Unmount the dialog; a later showDialog renders the next one.
      dialogRoot?.render(null)
      resolve(value)
    }
    dialogRoot!.render(h(Dialog, { opts: { ...opts, input: isPrompt }, okText, cancelText, onFinish: finish }))
  })
}

export function showConfirm(opts: DialogOptions): Promise<boolean> {
  return showDialog(Object.assign({}, opts, { input: false })) as Promise<boolean>
}

export function showPrompt(opts: DialogOptions): Promise<string | null> {
  return showDialog(Object.assign({}, opts, { input: true })) as Promise<string | null>
}
