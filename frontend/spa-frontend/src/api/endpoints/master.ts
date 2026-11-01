import { api } from '../client'
import type { Group, Property, Store, Unit } from '../types'

/** Slowly changing master data for pickers (owner, store, unit, property). */
export const masterApi = {
  groups: () => api.get<Group[]>('/groups'),
  stores: () => api.get<Store[]>('/stores'),
  units: () => api.get<Unit[]>('/units'),
  properties: () => api.get<Property[]>('/properties'),
}
