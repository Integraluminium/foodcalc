import {describe, expect, it} from 'vitest'
import type {StringKey} from './index'
import {t} from './index'

describe('t()', () => {
    it('löst verschachtelte Pfade auf', () => {
        expect(t('nav.recipes')).toBe('Rezepte')
    })

    it('interpoliert Platzhalter', () => {
        expect(t('workspace.mealsBadge', {count: 3})).toBe('3 Mahlzeiten')
    })

    it('gibt bei fehlendem Schlüssel den Pfad selbst zurück', () => {
        expect(t('gibts.nicht' as StringKey)).toBe('gibts.nicht')
    })
})
